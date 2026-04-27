import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { createHmac, timingSafeEqual } from 'crypto';
import { Server, Socket } from 'socket.io';
import {
  JoinRoomPayload,
  JoinUserRoomPayload,
  JoinedRoomEvent,
  JoinedUserRoomEvent,
  PaymentStatusUpdatePayload,
  SplitCompletionPayload,
  PaymentNotificationPayload,
  ActivityNewPayload,
  ActivityReadPayload,
  WsHandlerResponse,
  WsJwtPayload,
} from './payment-events.types';
import { AuthorizationService } from '../auth/services/authorization.service';

@Injectable()
export class WsJwtAuthService {
  constructor(private readonly configService: ConfigService) {}

  authenticateClient(client: Socket): WsJwtPayload {
    const rawToken = this.extractToken(client);
    if (!rawToken) {
      throw new UnauthorizedException('Missing JWT token');
    }

    const token = rawToken.replace(/^Bearer\s+/i, '').trim();
    return this.verifyToken(token);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const headerToken = client.handshake.headers.authorization;
    if (typeof headerToken === 'string' && headerToken.length > 0) {
      return headerToken;
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    return undefined;
  }

  private verifyToken(token: string): WsJwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid JWT format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const header = this.decodeJson(encodedHeader);
    const payload = this.decodeJson(encodedPayload) as WsJwtPayload;

    if (header.alg !== 'HS256') {
      throw new UnauthorizedException('Unsupported JWT algorithm');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const validSignature = this.isEqualSignature(signature, expectedSignature);
    if (!validSignature) {
      throw new UnauthorizedException('Invalid JWT signature');
    }

    if (
      typeof payload.exp === 'number' &&
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException('JWT token expired');
    }

    return payload;
  }

  private decodeJson(value: string): Record<string, unknown> {
    try {
      const parsed = Buffer.from(value, 'base64url').toString('utf8');
      return JSON.parse(parsed) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Invalid JWT payload');
    }
  }

  private isEqualSignature(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }
}

@Injectable()
export class WsPaymentAuthGuard implements CanActivate {
  constructor(
    private readonly wsJwtAuthService: WsJwtAuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const payload = this.wsJwtAuthService.authenticateClient(client);
    client.data.user = payload;
    return true;
  }
}

export function buildCorsConfig(configService: ConfigService): {
  origin: string | string[];
  methods: string[];
  credentials: boolean;
} {
  const env = configService.get<string>('NODE_ENV', 'development');
  const allowedOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS');

  let origin: string | string[];
  if (allowedOrigins) {
    origin = allowedOrigins.split(',').map((o) => o.trim());
  } else if (env === 'production') {
    origin = configService.get<string>('APP_URL', 'https://stellarsplit.com');
  } else {
    origin = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];
  }

  return {
    origin,
    methods: ['GET', 'POST'],
    credentials: true,
  };
}

const globalConfigService = new ConfigService();

@WebSocketGateway({
  cors: buildCorsConfig(globalConfigService),
})
export class PaymentGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private logger: Logger = new Logger('PaymentGateway');

  constructor(
    private readonly wsJwtAuthService: WsJwtAuthService,
    private readonly authorizationService: AuthorizationService,
  ) {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
  afterInit(_server: Server) {
    this.logger.log('PaymentGateway initialized');
  }

  handleConnection(client: Socket): void {
    try {
      const payload = this.wsJwtAuthService.authenticateClient(client);
      client.data.user = payload;
      this.logger.log(`Client connected: ${client.id}`);
    } catch {
      this.logger.warn(`Unauthorized socket connection rejected: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsPaymentAuthGuard)
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): Promise<WsHandlerResponse<JoinedRoomEvent>> {
    if (!payload?.roomId) {
      throw new BadRequestException('roomId is required');
    }

    const userId = (client.data.user as WsJwtPayload)?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user required');
    }

    const canAccess = await this.authorizationService.canAccessSplit(
      userId,
      payload.roomId,
    );

    if (!canAccess) {
      throw new UnauthorizedException('Not allowed to join this room');
    }

    client.join(payload.roomId);
    return { event: 'joined-room', data: { roomId: payload.roomId } };
  }

  emitPaymentStatusUpdate(roomId: string, data: PaymentStatusUpdatePayload): void {
    this.server.to(roomId).emit('payment-status-update', data);
  }

  emitSplitCompletion(roomId: string, data: SplitCompletionPayload): void {
    this.server.to(roomId).emit('split-completion', data);
  }

  emitPaymentNotification(roomId: string, data: PaymentNotificationPayload): void {
    this.server.to(roomId).emit('payment-notification', data);
  }

  sendActivityUpdate(userId: string, activity: ActivityNewPayload): void {
    this.server.to(`user-${userId}`).emit('activity-new', activity);
  }

  sendActivityReadUpdate(userId: string, activityIds: string[]): void {
    this.server.to(`user-${userId}`).emit('activity-read', { activityIds } as ActivityReadPayload);
  }

  sendActivityReadAllUpdate(userId: string): void {
    this.server.to(`user-${userId}`).emit('activity-read-all', {});
  }

  @UseGuards(WsPaymentAuthGuard)
  @SubscribeMessage('join-user-room')
  async handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinUserRoomPayload,
  ): Promise<WsHandlerResponse<JoinedUserRoomEvent>> {
    if (!payload?.userId) {
      throw new BadRequestException('userId is required');
    }

    const userId = (client.data.user as WsJwtPayload)?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user required');
    }

    if (payload.userId !== userId) {
      throw new UnauthorizedException('Cannot join another user room');
    }

    client.join(`user-${payload.userId}`);
    return { event: 'joined-user-room', data: { userId: payload.userId } };
  }
}

export { PaymentGateway as WebSocketGateway };