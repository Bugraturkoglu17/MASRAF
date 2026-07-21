const tls = require('tls');
const net = require('net');

const host = 'ep-square-scene-as8l08ar-pooler.c-4.eu-central-1.aws.neon.tech';
const port = 5432;

console.log('1) Raw TCP connect test...');
const socket = net.connect(port, host, () => {
  console.log('   TCP connected OK. Sending Postgres SSLRequest...');
  // Postgres SSLRequest packet: length(8) + code(80877103)
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(8, 0);
  buf.writeInt32BE(80877103, 4);
  socket.write(buf);
});

socket.setTimeout(10000);

socket.on('data', (data) => {
  console.log('   Received response byte:', data.toString('utf8', 0, 1), '(raw:', data, ')');
  if (data.toString('utf8', 0, 1) === 'S') {
    console.log('   Server agreed to SSL. Attempting TLS handshake...');
    const tlsSocket = tls.connect(
      { socket, host, servername: host, rejectUnauthorized: false },
      () => {
        console.log(
          '   TLS handshake SUCCESS. Authorized:',
          tlsSocket.authorized,
          'Cipher:',
          tlsSocket.getCipher(),
        );
        tlsSocket.end();
        process.exit(0);
      },
    );
    tlsSocket.on('error', (e) => {
      console.log('   TLS ERROR:', e.message);
      process.exit(1);
    });
  } else {
    console.log('   Server did NOT agree to SSL (byte was not "S")');
    process.exit(1);
  }
});

socket.on('timeout', () => {
  console.log('   TIMEOUT waiting for server response after TCP connect.');
  process.exit(1);
});

socket.on('error', (e) => {
  console.log('   SOCKET ERROR:', e.message);
  process.exit(1);
});

socket.on('close', () => {
  console.log('   Socket closed.');
});
