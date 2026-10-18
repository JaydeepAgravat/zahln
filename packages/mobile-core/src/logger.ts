import { scrub } from '@zahln/shared';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogEntry = { level: LogLevel; message: string; data?: unknown; at: string };
type Sink = (entry: LogEntry) => void;

const RING = 50;
const recent: LogEntry[] = [];
const sinks = new Set<Sink>();

/**
 * The only way the apps log (Biome bans `console.*`). Every entry is scrubbed first (tokens, IBANs, phone
 * numbers, balances and amounts never leave in a log line), kept in a small ring buffer for a crash report,
 * and printed only in development builds. A crash reporter plugs in with `addLogSink` and gets the same
 * scrubbed entries, so `beforeSend` has nothing left to leak.
 */
function log(level: LogLevel, message: string, data?: unknown) {
  const entry: LogEntry = {
    level,
    message: scrub(message) as string,
    ...(data === undefined ? {} : { data: scrub(data) }),
    at: new Date().toISOString(),
  };
  recent.push(entry);
  if (recent.length > RING) recent.shift();
  for (const sink of sinks) sink(entry);
  if (__DEV__) {
    // biome-ignore lint/suspicious/noConsole: the one place the app prints, development builds only
    console[level === 'debug' ? 'log' : level](`[zahln] ${entry.message}`, entry.data ?? '');
  }
}

export const logger = {
  debug: (message: string, data?: unknown) => log('debug', message, data),
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
};

export function addLogSink(sink: Sink): () => void {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

/** The last entries, already scrubbed: what a crash report may attach. */
export const recentLogs = (): readonly LogEntry[] => [...recent];
