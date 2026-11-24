import { testConnection } from './supabase';

/**
 * Database connection bootstrap.
 * Powered 100% by Supabase PostgreSQL.
 */
export async function connectDB(): Promise<void> {
  await testConnection();
}

export async function disconnectDB(): Promise<void> {
  // Pool handles cleanup
}
