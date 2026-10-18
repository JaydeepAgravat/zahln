import type { FastifyReply, FastifyRequest } from 'fastify';

const HEARTBEAT_MS = 15_000;

/**
 * Turn a request into a Server-Sent Events stream: headers (keeping CORS), a heartbeat so proxies
 * don't cut the connection, and one cleanup callback when the client goes away.
 */
export function openSse(req: FastifyRequest, reply: FastifyReply, onClose: () => void) {
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    ...(reply.getHeaders() as Record<string, string>),
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  req.raw.on('close', () => {
    clearInterval(heartbeat);
    onClose();
  });
  return (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
