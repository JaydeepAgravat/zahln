import { runMigrations } from '../src/db/migrate';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://zaster:zaster@localhost:5432/zaster_test';

export default async function setup() {
  await runMigrations(TEST_DATABASE_URL);
}
