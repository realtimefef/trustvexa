const net = require('net');

function createProxy(localPort, targetHost, targetPort) {
  const server = net.createServer((socket) => {
    const client = net.createConnection(targetPort, targetHost, () => {
      // connected
    });

    socket.pipe(client);
    client.pipe(socket);

    socket.on('error', (err) => {
      client.end();
    });

    client.on('error', (err) => {
      socket.end();
    });

    socket.on('close', () => {
      client.end();
    });

    client.on('close', () => {
      socket.end();
    });
  });

  server.listen(localPort, '127.0.0.1', () => {
    console.log(`Proxy listening on 127.0.0.1:${localPort} -> ${targetHost}:${targetPort}`);
  });
  
  return server;
}

const TARGET_HOST = '172.17.107.171';

createProxy(5434, TARGET_HOST, 5434);
createProxy(6379, TARGET_HOST, 6379);
