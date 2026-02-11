import express from 'express';
import http from 'http';
import { matchRouter } from './routes/matches.js';
import { attachWebSocketServer } from './ws/server.js';

const PORT = Number(process.env.PORT||8000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Express server!');
});

app.use('/matches', matchRouter);

const {broadcastMatchUpdate} = attachWebSocketServer(server);
app.locals.broadcastMatchUpdate = broadcastMatchUpdate;

server.listen(PORT, () => {
  const baseURL = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running at ${baseURL}`);
  console.log(`WebSocket endpoint available at ${baseURL.replace('http', 'ws')}/ws`);
});