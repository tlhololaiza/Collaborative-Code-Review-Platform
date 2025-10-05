import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from '../utils/auth';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export const setupWebSocket = (wss: WebSocketServer): void => {
  // Store connected clients
  const clients = new Map<string, AuthenticatedWebSocket>();

  wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    console.log('New WebSocket connection attempt');

    // Extract token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Authentication required');
      console.log('Connection closed: No token provided');
      return;
    }

    try {
      // Verify JWT token
      const decoded = verifyToken(token);
      ws.userId = decoded.id;
      ws.isAlive = true;

      // Store client connection
      clients.set(decoded.id, ws);
      console.log(`User ${decoded.id} connected via WebSocket`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Successfully connected to notification stream',
        userId: decoded.id
      }));

      // Handle pong responses
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle messages from client
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received message:', data);
          
          // Echo back for testing
          ws.send(JSON.stringify({
            type: 'echo',
            data
          }));
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        if (ws.userId) {
          clients.delete(ws.userId);
          console.log(`User ${ws.userId} disconnected`);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      ws.close(1008, 'Invalid token');
      console.log('Connection closed: Invalid token');
    }
  });

  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
    clients.forEach((ws, userId) => {
      if (ws.isAlive === false) {
        clients.delete(userId);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('WebSocket server is running');
};

// Function to broadcast notifications to specific user
export const notifyUser = (userId: string, notification: any, wss: WebSocketServer): void => {
  wss.clients.forEach((client: WebSocket) => {
    const authClient = client as AuthenticatedWebSocket;
    if (authClient.userId === userId && authClient.readyState === WebSocket.OPEN) {
      authClient.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));
    }
  });
};