import { io } from 'socket.io-client';

// Connect to your Node.js server URL
const SOCKET_URL = 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true
});
