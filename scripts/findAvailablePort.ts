import { once } from 'node:events';
import { createServer } from 'node:net';

// Windows can report an occupied or reserved port as access denied.
const UNAVAILABLE_CODES = ['EADDRINUSE', 'EACCES'];

// The requested port when it's free, or the next one that is.
export async function findAvailablePort(host: string, requestedPort: number) {
  let port = requestedPort;
  while (!(await isAvailable(host, port))) {
    port += 1;
  }

  return port;
}

async function isAvailable(host: string, port: number) {
  const server = createServer();

  try {
    server.listen(port, host);
    await once(server, 'listening');
    server.close();
    await once(server, 'close');

    return true;
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    if (!UNAVAILABLE_CODES.includes(code ?? '')) {
      throw error;
    }

    return false;
  }
}
