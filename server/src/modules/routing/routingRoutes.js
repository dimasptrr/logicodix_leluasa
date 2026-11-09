import { Router } from 'express';
import { compareRoutes, planRoute } from './routingController.js';

const router = Router();

router.get('/compare', compareRoutes);
router.post('/plan', planRoute);

export default router;

