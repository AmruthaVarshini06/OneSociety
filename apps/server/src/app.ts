import 'express-async-errors';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRouter from './shared/auth/auth.router';
import societyRouter from './shared/society/society.router';
import notificationRouter from './shared/notifications/notification.router';
import uploadRouter from './shared/uploads/upload.router';
import qrRouter from './shared/qr/qr.router';
import groupBuyingRouter from './modules/group-buying/index';
import shareRentRouter from './modules/share-rent/index';
import serviceHubRouter from './modules/service-hub/index';
import complaintsRouter from './modules/complaints/index';
import societyHelpRouter from './modules/society-help/index';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security & parsing
app.use(helmet());
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Block external providers from non-service routes
app.use((req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (
    user?.role === 'provider_external' &&
    !req.path.startsWith('/api/v1/services') &&
    !req.path.startsWith('/api/v1/society-help/gate/passes/provider') &&
    !req.path.startsWith('/api/v1/auth') &&
    !req.path.startsWith('/health')
  ) {
    res.status(403).json({ error: 'External providers can only access the ServiceHub.' });
    return;
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/society', societyRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/uploads', uploadRouter);
app.use('/api/v1/qr', qrRouter);
app.use('/api/v1/group-buying', groupBuyingRouter);
app.use('/api/v1/rentals', shareRentRouter);
app.use('/api/v1/services', serviceHubRouter);
app.use('/api/v1/complaints', complaintsRouter);
app.use('/api/v1/society-help', societyHelpRouter);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
