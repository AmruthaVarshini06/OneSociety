import { Router } from 'express';
import gateRouter from './routes/gate.router';
import maintenanceRouter from './routes/maintenance.router';
import eventsRouter from './routes/events.router';
import emergencyRouter from './routes/emergency.router';

const router = Router();

router.use('/gate', gateRouter);
router.use('/maintenance', maintenanceRouter);
router.use('/events', eventsRouter);
router.use('/emergency', emergencyRouter);

export default router;
