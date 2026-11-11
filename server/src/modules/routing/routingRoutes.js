import { Router } from 'express';
import { compareRoutes, planRoute, geocodeLocation, reverseGeocodeLocation } from './routingController.js';

const router = Router();

router.get('/compare', compareRoutes);
router.post('/plan', planRoute);
router.get('/geocode', geocodeLocation);
router.get('/reverse-geocode', reverseGeocodeLocation);

export default router;

