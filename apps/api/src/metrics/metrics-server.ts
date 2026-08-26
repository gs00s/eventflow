import { createServer } from 'node:http';
import { register } from 'prom-client';
import { env } from '../env';

// Separate port so /metrics stays off Cloud Run's public ingress; the sidecar reaches it over localhost.
export function startMetricsServer(): void {
  const server = createServer((req, res) => {
    if (req.url !== '/metrics') {
      res.writeHead(404).end();
      return;
    }

    res.setHeader('Content-Type', register.contentType);
    register
      .metrics()
      .then((body) => res.end(body))
      .catch(() => res.writeHead(500).end());
  });

  server.listen(env.METRICS_PORT, '0.0.0.0');
}
