import 'dotenv/config';
import { supabase, query } from '../src/config/supabase';

async function test() {
  console.info('[SUPABASE] Testing Supabase Client and PostgreSQL queries...');

  // 1. Direct SQL via pool
  const sqlRes = await query('SELECT count(*) FROM societies');
  console.info('[SUPABASE] PostgreSQL Pool query success. Society count:', sqlRes.rows[0].count);

  // 2. Supabase JS Client query
  const { data, error, count } = await supabase.from('societies').select('*', { count: 'exact' });
  if (error) {
    console.error('[SUPABASE] Supabase JS Client error:', error);
    process.exit(1);
  }

  console.info('[SUPABASE] Supabase JS Client query success! Count:', count);
  console.info('[SUPABASE] Connection test 100% successful!');
  process.exit(0);
}

test();
