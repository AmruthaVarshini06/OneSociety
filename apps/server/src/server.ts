import 'dotenv/config';
import http from 'http';
import app from './app';
import { testConnection } from './config/supabase';
import { initSocket } from './config/socket';
import { startAgenda, agenda } from './config/agenda';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function bootstrap() {
  try {
    // Connect to Supabase PostgreSQL
    await testConnection();

    // Create HTTP server
    const server = http.createServer(app);

    // Attach Socket.IO
    initSocket(server);

    // Start listening immediately
    server.listen(PORT, '0.0.0.0', () => {
      console.info(`[SERVER] OneSociety Server running on http://localhost:${PORT} (${process.env.NODE_ENV ?? 'development'})`);
      console.info(`[SERVER] Database: Supabase PostgreSQL connected`);
    });

    // Start background job scheduler
    startAgenda().catch((err) => {
      console.warn('[SCHEDULER] Background scheduler notice:', (err as any)?.message);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.info(`[SERVER] ${signal} received — shutting down gracefully`);
      try {
        await agenda.stop();
      } catch {
        // ignore
      }
      server.close(() => {
        console.info('[SERVER] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[SERVER] Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();
