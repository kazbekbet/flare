import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { Types } from 'mongoose';

import { FriendshipStatus } from '@flare/shared';

import { ConversationsService } from '../conversations/conversations.service.js';
import { EventBusService } from '../events/event-bus.service.js';
import { Friendship } from '../mongoose/schemas/friendship.schema.js';
import { User } from '../mongoose/schemas/user.schema.js';
import { FriendsService } from './friends.service.js';

const REQ_ID = new Types.ObjectId().toHexString();
const ADDR_ID = new Types.ObjectId().toHexString();
const FRIENDSHIP_ID = new Types.ObjectId().toHexString();
const NOW = new Date();

function makeFriendshipDoc(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: new Types.ObjectId(FRIENDSHIP_ID),
    id: FRIENDSHIP_ID,
    requesterId: new Types.ObjectId(REQ_ID),
    addresseeId: new Types.ObjectId(ADDR_ID),
    status: FriendshipStatus.PENDING,
    createdAt: NOW,
    updatedAt: NOW,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('FriendsService', () => {
  let service: FriendsService;
  let friendshipModel: Record<string, jest.Mock>;
  let userModel: Record<string, jest.Mock>;
  let conversationsService: Record<string, jest.Mock>;
  let eventBus: { emit: jest.Mock };

  beforeEach(async () => {
    friendshipModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
    };
    userModel = {
      exists: jest.fn(),
    };
    conversationsService = {
      startSession: jest.fn(),
      ensureDirectConversation: jest.fn(),
    };
    eventBus = { emit: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: getModelToken(Friendship.name), useValue: friendshipModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: ConversationsService, useValue: conversationsService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get(FriendsService);
  });

  describe('createRequest', () => {
    it('emits FriendRequestCreated event on success', async () => {
      userModel.exists.mockResolvedValue({ _id: ADDR_ID });
      friendshipModel.findOne.mockResolvedValue(null);
      const doc = makeFriendshipDoc();
      friendshipModel.create.mockResolvedValue(doc);

      const result = await service.createRequest(REQ_ID, { addresseeId: ADDR_ID });

      expect(result.status).toBe(FriendshipStatus.PENDING);
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FriendRequestCreated', addresseeId: ADDR_ID }),
      );
    });

    it('rejects self-request with BadRequestException', async () => {
      await expect(service.createRequest(REQ_ID, { addresseeId: REQ_ID })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid ObjectId addresseeId with NotFoundException', async () => {
      await expect(service.createRequest(REQ_ID, { addresseeId: 'not-an-id' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects duplicate request with ConflictException', async () => {
      userModel.exists.mockResolvedValue({ _id: ADDR_ID });
      friendshipModel.findOne.mockResolvedValue(makeFriendshipDoc());

      await expect(service.createRequest(REQ_ID, { addresseeId: ADDR_ID })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when addressee user does not exist', async () => {
      userModel.exists.mockResolvedValue(null);

      await expect(service.createRequest(REQ_ID, { addresseeId: ADDR_ID })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('accept', () => {
    it('creates conversation atomically and emits FriendRequestAccepted', async () => {
      const doc = makeFriendshipDoc();
      friendshipModel.findById.mockResolvedValue(doc);

      const CONV_ID = new Types.ObjectId().toHexString();
      const fakeSession = {
        withTransaction: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
        endSession: jest.fn().mockResolvedValue(undefined),
      };
      conversationsService.startSession.mockResolvedValue(fakeSession);
      conversationsService.ensureDirectConversation.mockResolvedValue(CONV_ID);

      const result = await service.accept(ADDR_ID, FRIENDSHIP_ID);

      expect(result.conversationId).toBe(CONV_ID);
      expect(result.friendship.status).toBe(FriendshipStatus.ACCEPTED);
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FriendRequestAccepted', requesterId: REQ_ID, conversationId: CONV_ID }),
      );
    });

    it('throws BadRequestException when non-addressee tries to accept', async () => {
      const doc = makeFriendshipDoc();
      friendshipModel.findById.mockResolvedValue(doc);

      // REQ_ID — инициатор, а не адресат
      await expect(service.accept(REQ_ID, FRIENDSHIP_ID)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns expected shape for both pending and accepted friendships', async () => {
      const rows = [
        makeFriendshipDoc({ status: FriendshipStatus.PENDING }),
        makeFriendshipDoc({ status: FriendshipStatus.ACCEPTED }),
      ];
      const sortMock = jest.fn().mockResolvedValue(rows);
      friendshipModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.list(REQ_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: FRIENDSHIP_ID, requesterId: REQ_ID, addresseeId: ADDR_ID });
    });
  });
});
