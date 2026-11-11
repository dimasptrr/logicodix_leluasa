import express from 'express';
import * as aiClient from './aiClient.js';

const router = express.Router();

router.post('/vision/detect', async (req, res) => {
  try {
    const data = await aiClient.detectObstacleVision(req.body);
    res.json(data);
  } catch (err) {
    res.status(502).json({
      status: 'error',
      message: 'AI Vision Service saat ini tidak tersedia',
      details: err.message
    });
  }
});

router.post('/voice/chat', async (req, res) => {
  try {
    const data = await aiClient.chatVoiceAssistant(req.body);
    res.json(data);
  } catch (err) {
    res.status(502).json({
      status: 'error',
      message: 'AI Voice Service saat ini tidak tersedia',
      details: err.message
    });
  }
});

router.post('/routes/evaluate', async (req, res) => {
  try {
    const data = await aiClient.evaluateRouteAccessibility(req.body);
    res.json(data);
  } catch (err) {
    res.status(502).json({
      status: 'error',
      message: 'AI Route Evaluator saat ini tidak tersedia',
      details: err.message
    });
  }
});

router.post('/weather/analyze', async (req, res) => {
  try {
    const data = await aiClient.analyzeWeatherTraction(req.body);
    res.json(data);
  } catch (err) {
    res.status(502).json({
      status: 'error',
      message: 'AI Weather Service saat ini tidak tersedia',
      details: err.message
    });
  }
});

export default router;

