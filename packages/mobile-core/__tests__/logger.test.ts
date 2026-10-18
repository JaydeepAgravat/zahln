import { addLogSink, logger, recentLogs } from '../src/logger';

describe('logger', () => {
  it('scrubs before anything sees the entry: sinks, the ring buffer, the console', () => {
    const seen: unknown[] = [];
    const off = addLogSink((e) => seen.push(e));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('pay failed for +4915100000001', {
      headers: { authorization: 'Bearer secret-token-123456' },
      attempt: { amountCents: 630, status: 'not_charged' },
    });
    off();
    spy.mockRestore();
    const entry = recentLogs().at(-1);
    expect(entry).toMatchObject({
      level: 'error',
      message: 'pay failed for [phone]',
      data: {
        headers: { authorization: '[redacted]' },
        attempt: { amountCents: '[redacted]', status: 'not_charged' },
      },
    });
    expect(seen).toContainEqual(entry);
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-token');
  });
});
