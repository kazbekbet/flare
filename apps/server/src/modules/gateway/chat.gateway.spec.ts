import { Test } from '@nestjs/testing';

import { Types } from 'mongoose';
import { Subject } from 'rxjs';

import type { AppEvent } from '../events/app-events.js';
import { EventBusService } from '../events/event-bus.service.js';
import { ChatGateway, ServerEvents } from './chat.gateway.js';
import { GatewayEventsBridge } from './gateway-events.bridge.js';

const FAKE_USER_ID = new Types.ObjectId().toHexString();

function makeSocket(userId?: string) {
  return {
    id: 'socket-1',
    data: { userId },
    handshake: { auth: {}, headers: {} },
    join: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  };
}

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  beforeEach(() => {
    // Создаём напрямую, чтобы не поднимать WsJwtGuard + JwtService в юнит-тестах.
    const presenceModel = { updateOne: jest.fn().mockResolvedValue({}), deleteOne: jest.fn().mockResolvedValue({}) };
    const conversationModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    };
    const messagesService = {
      create: jest.fn(),
      markDelivered: jest.fn(),
      markRead: jest.fn(),
      getSenderIds: jest.fn().mockResolvedValue([]),
    };
    const eventBus = { emit: jest.fn() };

    gateway = new ChatGateway(
      presenceModel as never,
      conversationModel as never,
      messagesService as never,
      eventBus as never,
    );
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([]) }),
    } as never;
  });

  describe('handleConnection', () => {
    it('disconnects client when userId is missing', async () => {
      const socket = makeSocket(undefined);
      await gateway.handleConnection(socket as never);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('joins the user room when userId is present', async () => {
      const socket = makeSocket(FAKE_USER_ID);
      await gateway.handleConnection(socket as never);
      expect(socket.join).toHaveBeenCalledWith(`user:${FAKE_USER_ID}`);
    });
  });

  describe('emitToUser', () => {
    it('emits to the correct room', () => {
      const emitMock = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: emitMock });

      gateway.emitToUser(FAKE_USER_ID, 'test:event', { foo: 'bar' });

      expect(gateway.server.to).toHaveBeenCalledWith(`user:${FAKE_USER_ID}`);
      expect(emitMock).toHaveBeenCalledWith('test:event', { foo: 'bar' });
    });
  });
});

describe('GatewayEventsBridge', () => {
  let bridge: GatewayEventsBridge;
  let subject: Subject<AppEvent>;
  let emitToUser: jest.Mock;

  beforeEach(async () => {
    subject = new Subject<AppEvent>();
    emitToUser = jest.fn();

    const fakeEventBus = { events$: subject.asObservable() };
    const fakeGateway = { emitToUser };

    const module = await Test.createTestingModule({
      providers: [
        GatewayEventsBridge,
        { provide: EventBusService, useValue: fakeEventBus },
        { provide: ChatGateway, useValue: fakeGateway },
      ],
    }).compile();

    bridge = module.get(GatewayEventsBridge);
    bridge.onModuleInit();
  });

  it('forwards FriendRequestCreated to addressee via gateway', () => {
    const friendship = {} as never;
    subject.next({ type: 'FriendRequestCreated', addresseeId: 'addr-1', friendship });

    expect(emitToUser).toHaveBeenCalledWith('addr-1', ServerEvents.FRIEND_REQUEST, friendship);
  });

  it('forwards FriendRequestAccepted to requester via gateway', () => {
    const friendship = {} as never;
    subject.next({ type: 'FriendRequestAccepted', requesterId: 'req-1', friendship, conversationId: 'conv-1' });

    expect(emitToUser).toHaveBeenCalledWith(
      'req-1',
      ServerEvents.FRIEND_ACCEPTED,
      expect.objectContaining({ conversationId: 'conv-1' }),
    );
  });
});
