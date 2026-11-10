import { Router } from 'express';
import { createObstacle } from './obstacleController.js';

const router = Router();

router.post('/', createObstacle);

export default router;