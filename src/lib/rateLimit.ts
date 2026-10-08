// Tiny in-memory rate limiter (per server process) to protect paid Google API calls.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) {
      hits.forEach((v, k) => {
        if (v.reset < now) hits.delete(k);
      });
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip')) || 'unknown';
}
