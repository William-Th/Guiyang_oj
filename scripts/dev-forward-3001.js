const net = require('net');
const server = net.createServer((client) => {
  const upstream = net.connect(3003, '127.0.0.1');
  client.pipe(upstream);
  upstream.pipe(client);
  client.on('error', () => upstream.destroy());
  upstream.on('error', () => client.destroy());
});
server.listen(3001, '127.0.0.1', () => console.log('forwarding 3001 -> 3003'));
