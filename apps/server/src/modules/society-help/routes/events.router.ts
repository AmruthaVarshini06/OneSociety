import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import {
  createEventHandler,
  getEventsDashboardHandler,
  addPresidentNoteHandler,
} from '../controllers/events.controller';

const router = Router();

router.use(authenticate);

router.post('/', createEventHandler);
router.get('/', getEventsDashboardHandler);
router.get('/dashboard', getEventsDashboardHandler);
router.post('/:eventId/note', addPresidentNoteHandler);

export default router;
