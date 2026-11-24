import { Router } from 'express';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', (_req, res) => res.status(501).json({ message: 'Not implemented yet — P4' }));
router.get('/:id/signed-url', (_req, res) =>
  res.status(501).json({ message: 'Not implemented yet — P4' }),
);

export default router;
