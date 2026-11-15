import http from 'http';
import type { AddressInfo } from 'net';

// tiny fake backend: echoes the path it received and whether the api key leaked through
export const startFakeUpstream = () =>
  new Promise<{ server: http.Server; url: string }>((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ path: req.url, leakedKey: req.headers['x-api-key'] ?? null }));
    });
    server.listen(0, () =>
      resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }),
    );
  });