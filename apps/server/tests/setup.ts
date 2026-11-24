import { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();

  // These env vars are injected into every test worker process
  process.env.MONGO_URI = uri;
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars_long__';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long_';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.FCM_ENABLED = 'false';

  // Store instance so globalTeardown can shut it down
  (global as Record<string, unknown>).__MONGOD__ = mongod;
  // Store URI so test files can read it via global (env var is the preferred way)
  (global as Record<string, unknown>).__MONGO_URI__ = uri;
}
