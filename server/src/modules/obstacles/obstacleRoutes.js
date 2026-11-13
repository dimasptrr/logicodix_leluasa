import { Router } from 'express';
import { createObstacle, updateObstacle, deleteObstacle } from './obstacleController.js';

const router = Router();

router.post('/', createObstacle);
router.patch('/:id', updateObstacle);
router.delete('/:id', deleteObstacle);

export default router;