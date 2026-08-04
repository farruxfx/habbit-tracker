import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class TelegramGateway {
  @WebSocketServer()
  server: Server;

  emitEvent(event: string, data: any) {
    this.server.emit(event, data);
  }

  @SubscribeMessage('joinDashboard')
  handleJoinDashboard(client: any, payload: any) {
    client.join('dashboard');
    return { event: 'joined', data: 'dashboard' };
  }
}
