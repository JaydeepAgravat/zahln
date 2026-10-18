import records from '@/art-src/records.json';

export type Credit = {
  use: string;
  title: string;
  artist: string;
  date: string;
  collection: string;
  objectUrl: string;
  licence: string;
};

/** Licence evidence written by scripts/fetch-art.mjs from the museums' own APIs (see ASSETS.md). */
export const credits = records as Credit[];

export function creditFor(use: string): Credit {
  const c = credits.find((r) => r.use === use);
  if (!c) throw new Error(`No licence record for art "${use}"`);
  return c;
}
