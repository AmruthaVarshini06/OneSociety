import 'dotenv/config';
import { login } from '../src/shared/auth/auth.service';

async function testLogins() {
  console.info('[SUPABASE LOGIN TEST] Testing user logins directly against Supabase database...');

  const accounts = [
    { u: 'suresh.kumar', p: 'Demo@1234', role: 'resident' },
    { u: 'ramesh.naidu', p: 'Demo@1234', role: 'president' },
    { u: 'guard.gate1', p: 'Guard@1234', role: 'guard' },
    { u: 'sunita_maid', p: 'Provider#123', role: 'provider_external' },
  ];

  for (const acc of accounts) {
    const res = await login(acc.u, acc.p);
    console.info(`✓ Successfully logged in as ${acc.u} (${res.role}). JWT token generated: ${res.accessToken.slice(0, 25)}...`);
  }

  console.info('[SUPABASE LOGIN TEST] All test accounts successfully authenticated against Supabase!');
  process.exit(0);
}

testLogins().catch((err) => {
  console.error('[SUPABASE LOGIN TEST] Failed:', err);
  process.exit(1);
});
