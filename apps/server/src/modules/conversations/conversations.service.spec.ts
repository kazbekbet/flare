import { ConflictException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { Types } from 'mongoose';

import { ConversationType } from '@flare/shared';

import { Conversation } from '../mongoose/schemas/conversation.schema.js';
import { ConversationsService } from './conversations.service.js';

const USER_A = new Types.ObjectId().toHexString();
const USER_B = new Types.ObjectId().toHexString();
const CONV_ID = new Types.ObjectId().toHexString();

function makeSession() {
  return {
    withTransaction: jest.fn(),
    endSession: jest.fn(),
  };
}

describe('ConversationsService', () => {
  let service: ConversationsService;
  let conversationModel: Record<string, jest.Mock>;
  let connection: { startSession: jest.Mock };

  beforeEach(async () => {
    conversationModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    connection = { startSession: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: getModelToken(Conversation.name), useValue: conversationModel },
        { provide: getConnectionToken(), useValue: connection },
      ],
    }).compile();

    service = module.get(ConversationsService);
  });

  describe('ensureDirectConversation', () => {
    // Для полной интеграции нужна реальная инфраструктура DB/session — юнит-тест использует мок сессии.

    it('returns existing conversation id when one already exists', async () => {
      const existingId = new Types.ObjectId(CONV_ID);
      const sessionMock = makeSession();
      // Chain: .findOne().session().lean()
      conversationModel.findOne.mockReturnValue({
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: existingId }),
        }),
      });

      const result = await service.ensureDirectConversation([USER_A, USER_B], sessionMock as never);
      expect(result).toBe(String(existingId));
      expect(conversationModel.create).not.toHaveBeenCalled();
    });

    it('creates and returns new conversation id when none exists', async () => {
      const newId = new Types.ObjectId(CONV_ID);
      const sessionMock = makeSession();
      conversationModel.findOne.mockReturnValue({
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      conversationModel.create.mockResolvedValue([{ id: String(newId), type: ConversationType.DIRECT }]);

      const result = await service.ensureDirectConversation([USER_A, USER_B], sessionMock as never);
      expect(result).toBe(String(newId));
      expect(conversationModel.create).toHaveBeenCalledWith(
        [expect.objectContaining({ type: ConversationType.DIRECT })],
        { session: sessionMock },
      );
    });

    it('throws ConflictException when both member ids are equal', async () => {
      const sessionMock = makeSession();
      await expect(service.ensureDirectConversation([USER_A, USER_A], sessionMock as never)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('startSession', () => {
    it('delegates to mongoose connection', async () => {
      const fakeSession = makeSession();
      connection.startSession.mockResolvedValue(fakeSession);

      const result = await service.startSession();
      expect(result).toBe(fakeSession);
    });
  });
});
