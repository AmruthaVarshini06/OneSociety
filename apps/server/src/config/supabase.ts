import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded regardless of working directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

const supabaseUrl = requireEnv('SUPABASE_URL');
const supabaseKey = requireEnv('SUPABASE_KEY');
const databaseUrl = requireEnv('DATABASE_URL');

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function testConnection(): Promise<void> {
  const res = await query('SELECT NOW() as current_time');
  console.info(`[SUPABASE] PostgreSQL connected. Server time: ${res.rows[0].current_time}`);
}
