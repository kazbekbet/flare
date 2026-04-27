import { BadRequestException, Controller, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { isValidObjectId } from 'mongoose';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { type AuthenticatedUser } from '../../common/types/authenticated.types.js';
import { ConversationsService } from '../conversations/conversations.service.js';
import { type MessageDocument } from '../mongoose/schemas/message.schema.js';
import { MessagesService } from './messages.service.js';

/**
 * REST-эндпоинты для работы с сообщениями переписки.
 * Все маршруты требуют валидного access-токена (JwtAuthGuard).
 */
@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * Возвращает сообщения переписки с cursor-пагинацией.
   * Перед выдачей проверяет, что текущий пользователь — участник переписки.
   */
  @Get()
  @ApiOperation({ summary: 'Сообщения переписки (cursor-пагинация)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'ID последнего загруженного сообщения' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество сообщений (по умолчанию 50)' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<MessageDocument[]> {
    if (!isValidObjectId(conversationId)) {
      throw new BadRequestException({ message: 'Invalid conversationId', code: 'INVALID_ID' });
    }

    if (cursor && !isValidObjectId(cursor)) {
      throw new BadRequestException({ message: 'Invalid cursor', code: 'INVALID_CURSOR' });
    }

    const isMember = await this.conversationsService.isMember(conversationId, user.id);

    if (!isMember) {
      throw new ForbiddenException({ message: 'Not a member of this conversation', code: 'NOT_MEMBER' });
    }

    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100) : 50;

    return this.messagesService.findByConversation(conversationId, cursor, parsedLimit);
  }
}
