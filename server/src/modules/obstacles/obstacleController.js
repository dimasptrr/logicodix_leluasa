import { randomUUID } from 'node:crypto';
import { config } from '../../config/env.js';

const PHOTO_BUCKET = 'obstacle-photos';
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const SEVERITIES = new Set(['impassable', 'difficult', 'passable']);

function parseCoordinates(value) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  if (
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

function parsePhoto(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return null;

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) return null;

  const validSignature = match[1] === 'image/jpeg'
    ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    : match[1] === 'image/png'
    ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

  return validSignature ? { buffer, contentType: match[1] } : null;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    ...extra
  };
}

function storageObjectUrl(objectPath) {
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${PHOTO_BUCKET}/${encodedPath}`;
}

export const inMemoryReports = [];

async function ensureBucketExists() {
  try {
    const bucketUrl = `${config.supabaseUrl}/storage/v1/bucket/${PHOTO_BUCKET}`;
    const check = await fetch(bucketUrl, { headers: supabaseHeaders() });
    if (check.status === 404) {
      await fetch(`${config.supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: supabaseHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: PHOTO_BUCKET, name: PHOTO_BUCKET, public: true })
      });
      console.log(`[Obstacle] Storage bucket '${PHOTO_BUCKET}' berhasil dibuat otomatis.`);
    }
  } catch (err) {
    console.warn('[Obstacle] Gagal memastikan bucket:', err.message);
  }
}

export async function createObstacle(req, res) {
  const {
    title,
    locationText,
    location,
    coordinates: coordinateInput,
    locationAccuracyM,
    category,
    severity,
    clearance,
    notes = '',
    forwardDpupr = false,
    shareCommunity = true,
    uploadedImage
  } = req.body || {};
  const coordinates = parseCoordinates(coordinateInput);

  if (!coordinates) {
    return res.status(400).json({ status: 'error', message: 'Koordinat latitude/longitude wajib valid.' });
  }
  if (!title || !category || !SEVERITIES.has(severity)) {
    return res.status(400).json({ status: 'error', message: 'Judul, kategori, dan severity laporan wajib valid.' });
  }
  if (locationAccuracyM != null && (!Number.isFinite(Number(locationAccuracyM)) || Number(locationAccuracyM) < 0)) {
    return res.status(400).json({ status: 'error', message: 'Akurasi lokasi harus berupa angka nol atau lebih.' });
  }
  const photo = parsePhoto(uploadedImage);
  if (!photo) {
    return res.status(400).json({ status: 'error', message: 'Foto wajib berupa JPEG, PNG, atau WebP valid dengan ukuran maksimal 1.5 MiB.' });
  }
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    return res.status(503).json({ status: 'error', message: 'Penyimpanan laporan belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di server.' });
  }

  const extension = photo.contentType === 'image/jpeg' ? 'jpg' : photo.contentType.split('/')[1];
  const photoPath = `${randomUUID()}/report-${Date.now()}.${extension}`;
  const photoUrl = storageObjectUrl(photoPath);

  try {
    let uploadResponse = await fetch(photoUrl, {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': photo.contentType,
        'x-upsert': 'true'
      }),
      body: photo.buffer
    });

    if (!uploadResponse.ok) {
      // Jika gagal karena bucket belum dibuat, coba buat otomatis lalu unggah ulang
      await ensureBucketExists();
      uploadResponse = await fetch(photoUrl, {
        method: 'POST',
        headers: supabaseHeaders({
          'Content-Type': photo.contentType,
          'x-upsert': 'true'
        }),
        body: photo.buffer
      });
    }

    if (!uploadResponse.ok) {
      const details = await uploadResponse.text();
      console.error('[Obstacle] Photo upload failed:', details);
      return res.status(502).json({ status: 'error', message: 'Foto laporan gagal disimpan.' });
    }

    const reportPayload = {
      title: String(title).trim(),
      location_text: String(locationText || location || '').trim() || null,
      location: { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] },
      location_accuracy_m: locationAccuracyM == null ? null : Number(locationAccuracyM),
      category: String(category).trim(),
      severity: severity === 'passable' ? 'caution' : severity,
      clearance_cm: clearance == null ? null : Number(clearance),
      notes: String(notes),
      photo_path: photoPath,
      forward_dpupr: Boolean(forwardDpupr),
      is_public: Boolean(shareCommunity)
    };

    if (reportPayload.clearance_cm !== null && (!Number.isInteger(reportPayload.clearance_cm) || reportPayload.clearance_cm < 0 || reportPayload.clearance_cm > 32767)) {
      await fetch(photoUrl, { method: 'DELETE', headers: supabaseHeaders() }).catch(() => {});
      return res.status(400).json({ status: 'error', message: 'Lebar celah harus berupa bilangan bulat non-negatif.' });
    }

    const publicPhotoUrl = `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${PHOTO_BUCKET}/${photoPath}`;

    let report = null;

    // 1. Simpan langsung ke tabel Supabase 'laporan_leluasa' (sesuai skema yang dibuat di database)
    try {
      const laporanLeluasaPayload = {
        photo_url: publicPhotoUrl,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        obstacle_type: String(category || title).trim(),
        severity: severity === 'passable' ? 'caution' : severity,
        gap_width: String(clearance == null ? 'less_80' : clearance < 80 ? 'less_80' : clearance <= 120 ? '80_120' : 'more_120'),
        verification_status: 'pending',
        weather_condition: notes ? String(notes).slice(0, 100) : 'Normal'
      };

      const resLaporan = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/laporan_leluasa`, {
        method: 'POST',
        headers: supabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        }),
        body: JSON.stringify(laporanLeluasaPayload)
      });
      const dataLaporan = await resLaporan.json().catch(() => null);
      if (resLaporan.ok && Array.isArray(dataLaporan) && dataLaporan[0]) {
        report = {
          id: String(dataLaporan[0].id),
          title: dataLaporan[0].obstacle_type || String(title).trim(),
          location_text: locationText || `Titik GPS (${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)})`,
          coordinates,
          category: dataLaporan[0].obstacle_type,
          severity: dataLaporan[0].severity,
          status: dataLaporan[0].verification_status || 'pending',
          clearance_cm: clearance,
          reported_at: dataLaporan[0].created_at,
          created_at: dataLaporan[0].created_at,
          photo_path: photoPath,
          photo_url: publicPhotoUrl,
          forward_dpupr: Boolean(forwardDpupr)
        };
        console.log('[Obstacle] Berhasil disimpan langsung ke tabel Supabase laporan_leluasa ID:', report.id);
      } else {
        console.warn('[Obstacle] Supabase insert laporan_leluasa notice:', dataLaporan);
      }
    } catch (e) {
      console.warn('[Obstacle] Gagal insert ke tabel laporan_leluasa:', e.message);
    }

    // 2. Fallback simpan in-memory jika koneksi database sedang offline
    if (!report) {
      report = {
        id: randomUUID(),
        title: String(title).trim(),
        location_text: String(locationText || location || '').trim() || null,
        coordinates,
        category: String(category).trim(),
        severity: severity === 'passable' ? 'caution' : severity,
        clearance_cm: clearance == null ? null : Number(clearance),
        notes: String(notes),
        photo_path: photoPath,
        photo_url: publicPhotoUrl,
        forward_dpupr: Boolean(forwardDpupr),
        is_public: Boolean(shareCommunity),
        status: 'pending',
        reported_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      inMemoryReports.unshift(report);
      console.log('[Obstacle] Laporan disimpan ke memori server:', report.id);
    }

    return res.status(201).json({
      success: true,
      message: 'Obstacle report registered successfully',
      data: {
        id: report.id,
        title: report.title,
        name: report.title,
        location: report.location_text,
        location_text: report.location_text,
        coordinates,
        lat: coordinates.lat,
        lng: coordinates.lng,
        category: report.category,
        severity: report.severity,
        status: report.status,
        clearance: report.clearance_cm,
        clearance_cm: report.clearance_cm,
        reportedTime: report.created_at,
        reported_at: report.created_at,
        created_at: report.created_at,
        upvotes: 0,
        confirmedCount: 0,
        dpuprForwarded: report.forward_dpupr,
        photo_path: report.photo_path,
        photo_url: publicPhotoUrl,
        image_url: publicPhotoUrl
      }
    });
  } catch (error) {
    console.error('[Obstacle] Create report failed:', error);
    return res.status(502).json({ status: 'error', message: 'Laporan tidak dapat disimpan saat ini.' });
  }
}

export async function deleteObstacle(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ status: 'error', message: 'ID laporan wajib diisi.' });
  }

  let photoPathToDelete = null;

  // 1. Hapus dari tabel Supabase 'laporan_leluasa'
  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    try {
      // Ambil photo_url terlebih dahulu untuk membersihkan file storage
      const getResp = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/laporan_leluasa?id=eq.${id}&select=*`, {
        headers: supabaseHeaders()
      });
      if (getResp.ok) {
        const rows = await getResp.json().catch(() => []);
        if (rows.length > 0 && rows[0].photo_url) {
          const match = rows[0].photo_url.match(/obstacle-photos\/(.+)$/);
          if (match) photoPathToDelete = decodeURIComponent(match[1]);
        }
      }

      const delResp = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/laporan_leluasa?id=eq.${id}`, {
        method: 'DELETE',
        headers: supabaseHeaders({ Prefer: 'return=representation' })
      });
      if (delResp.ok) {
        console.log(`[Obstacle] Laporan ID ${id} berhasil dihapus dari tabel Supabase.`);
      }

      // Hapus file foto dari Supabase Storage jika ada
      if (photoPathToDelete) {
        const delPhotoUrl = `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${PHOTO_BUCKET}/${encodeURIComponent(photoPathToDelete)}`;
        await fetch(delPhotoUrl, {
          method: 'DELETE',
          headers: supabaseHeaders()
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[Obstacle] Supabase delete error:', err.message);
    }
  }

  // 2. Hapus juga dari inMemoryReports jika ada
  const memIndex = inMemoryReports.findIndex(r => String(r.id) === String(id));
  if (memIndex !== -1) {
    inMemoryReports.splice(memIndex, 1);
  }

  return res.json({
    status: 'success',
    message: `Laporan #${id} berhasil dihapus dari database.`,
    id
  });
}

export async function updateObstacle(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ status: 'error', message: 'ID laporan wajib diisi.' });
  }

  const {
    title,
    category,
    severity,
    gap_width,
    clearance_cm,
    notes,
    lat,
    lng,
    latitude,
    longitude,
    location_text
  } = req.body || {};

  const targetLat = Number(lat ?? latitude);
  const targetLng = Number(lng ?? longitude);
  const hasCoords = Number.isFinite(targetLat) && Number.isFinite(targetLng);

  let updatedRow = null;

  // 1. Update ke Supabase 'laporan_leluasa'
  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    try {
      const updatePayload = {};
      if (hasCoords) {
        updatePayload.latitude = targetLat;
        updatePayload.longitude = targetLng;
      }
      if (category || title) {
        updatePayload.obstacle_type = String(category || title).trim();
      }
      if (severity) {
        updatePayload.severity = severity === 'passable' ? 'caution' : severity;
      }
      if (gap_width) {
        updatePayload.gap_width = gap_width;
      } else if (clearance_cm != null) {
        updatePayload.gap_width = clearance_cm < 80 ? 'less_80' : clearance_cm <= 120 ? '80_120' : 'more_120';
      }
      if (notes != null) {
        updatePayload.weather_condition = String(notes).slice(0, 150);
      }

      const patchResp = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/laporan_leluasa?id=eq.${id}`, {
        method: 'PATCH',
        headers: supabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        }),
        body: JSON.stringify(updatePayload)
      });

      if (patchResp.ok) {
        const rows = await patchResp.json().catch(() => []);
        if (rows.length > 0) {
          const r = rows[0];
          updatedRow = {
            id: String(r.id),
            title: r.obstacle_type,
            name: r.obstacle_type,
            category: r.obstacle_type,
            severity: r.severity === 'caution' ? 'difficult' : (r.severity || 'difficult'),
            status: r.verification_status || 'active',
            lat: r.latitude,
            lng: r.longitude,
            latitude: r.latitude,
            longitude: r.longitude,
            coordinates: { lat: r.latitude, lng: r.longitude },
            location: location_text || `Titik GPS (${r.latitude?.toFixed(6)}, ${r.longitude?.toFixed(6)})`,
            location_text: location_text || `Titik GPS (${r.latitude?.toFixed(6)}, ${r.longitude?.toFixed(6)})`,
            clearance: r.gap_width === 'less_80' ? 65 : r.gap_width === '80_120' ? 95 : 120,
            clearance_cm: r.gap_width === 'less_80' ? 65 : r.gap_width === '80_120' ? 95 : 120,
            clearanceLabel: r.gap_width === 'less_80' ? '< 80 cm' : r.gap_width === '80_120' ? '80 - 120 cm' : '> 120 cm',
            photo_url: r.photo_url,
            image_url: r.photo_url,
            reported_at: r.created_at,
            created_at: r.created_at,
            notes: r.weather_condition
          };
          console.log(`[Obstacle] Laporan ID ${id} berhasil diupdate di database Supabase.`);
        }
      }
    } catch (err) {
      console.warn('[Obstacle] Supabase update warning:', err.message);
    }
  }

  // 2. Update in-memory array jika ada
  const memIndex = inMemoryReports.findIndex(r => String(r.id) === String(id));
  if (memIndex !== -1) {
    inMemoryReports[memIndex] = {
      ...inMemoryReports[memIndex],
      ...(hasCoords ? { coordinates: { lat: targetLat, lng: targetLng }, lat: targetLat, lng: targetLng } : {}),
      ...(title ? { title, name: title } : {}),
      ...(category ? { category } : {}),
      ...(severity ? { severity } : {}),
      ...(notes != null ? { notes } : {})
    };
    if (!updatedRow) updatedRow = inMemoryReports[memIndex];
  }

  return res.json({
    status: 'success',
    message: `Laporan #${id} berhasil diperbarui di database.`,
    data: updatedRow || { id, ...req.body }
  });
}