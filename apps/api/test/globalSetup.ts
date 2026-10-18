import { runMigrations } from '../src/db/migrate';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://zahln:zahln@localhost:5432/zahln_test';

export default async function setup() {
  await runMigrations(TEST_DATABASE_URL);
}
