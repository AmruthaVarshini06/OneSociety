import { testConnection } from './supabase';

export async function connectDB(): Promise<void> {
  await testConnection();
}

export async function disconnectDB(): Promise<void> {
}
