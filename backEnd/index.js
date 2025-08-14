
const path = require('path');
const Fastify = require('fastify');
const WebSocket = require('ws');

const fastify = Fastify();

fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

const server = fastify.server;
const wss = new WebSocket.Server({ server });


wss.on('connection', (ws) => {
  console.log('A client connected');

  ws.on('message', (message) => {
    console.log('Chat message:', message.toString());

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('A client disconnected');
  });
});

fastify.register(require('@fastify/static'), {
  root: path.join('/home/mmad/Desktop/ChatService/services/chat-service/frontEnd'),
});


fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});