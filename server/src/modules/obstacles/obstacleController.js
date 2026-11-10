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
    const uploadResponse = await fetch(photoUrl, {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': photo.contentType,
        'x-upsert': 'false'
      }),
      body: photo.buffer
    });
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
      await fetch(photoUrl, { method: 'DELETE', headers: supabaseHeaders() });
      return res.status(400).json({ status: 'error', message: 'Lebar celah harus berupa bilangan bulat non-negatif.' });
    }

    const insertResponse = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/obstacle_reports`, {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(reportPayload)
    });
    const inserted = await insertResponse.json().catch(() => null);
    if (!insertResponse.ok || !Array.isArray(inserted) || !inserted[0]) {
      await fetch(photoUrl, { method: 'DELETE', headers: supabaseHeaders() });
      console.error('[Obstacle] Database insert failed:', inserted);
      return res.status(502).json({ status: 'error', message: 'Laporan gagal disimpan ke database.' });
    }

    const report = inserted[0];
    return res.status(201).json({
      success: true,
      message: 'Obstacle report registered successfully',
      data: {
        id: report.id,
        title: report.title,
        location: report.location_text,
        coordinates,
        category: report.category,
        severity,
        status: report.status,
        clearance: report.clearance_cm,
        reportedTime: report.created_at,
        upvotes: 0,
        confirmedCount: 0,
        dpuprForwarded: report.forward_dpupr,
        photo_path: report.photo_path
      }
    });
  } catch (error) {
    console.error('[Obstacle] Create report failed:', error);
    return res.status(502).json({ status: 'error', message: 'Laporan tidak dapat disimpan saat ini.' });
  }
}