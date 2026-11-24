import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  console.info('[SUPABASE] Connecting to PostgreSQL database...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.info('[SUPABASE] Connected successfully!');

    const schemaPath = path.resolve(__dirname, '../../../supabase_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.info('[SUPABASE] Executing schema DDL migrations...');
    await client.query(sql);
    console.info('[SUPABASE] Schema migrations executed successfully!');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.info(`[SUPABASE] Total tables created in public schema: ${res.rows.length}`);
    res.rows.forEach((r, idx) => {
      console.info(`  ${idx + 1}. ${r.table_name}`);
    });

    client.release();
  } catch (err) {
    console.error('[SUPABASE] Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
