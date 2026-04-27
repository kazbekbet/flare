import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { type AuthenticatedUser } from '../../common/types/authenticated.types.js';
import { type ConversationDocument } from '../mongoose/schemas/conversation.schema.js';
import { ConversationsService } from './conversations.service.js';

/**
 * REST-эндпоинты для работы со списком переписок текущего пользователя.
 * Все маршруты требуют валидного access-токена (JwtAuthGuard).
 */
@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  /**
   * Возвращает список переписок текущего пользователя.
   * Сортировка — по дате последнего сообщения (новые первые).
   */
  @Get()
  @ApiOperation({ summary: 'Список переписок текущего пользователя' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ConversationDocument[]> {
    return this.conversationsService.listForUser(user.id);
  }
}
