import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/types/authenticated.types.js';
import type { CreateFriendRequestDto } from './dto/friends.dto.js';
import type { AcceptFriendResult, FriendshipView,FriendsService } from './friends.service.js';

/**
 * REST-эндпоинты для управления запросами дружбы.
 * Все маршруты требуют валидного access-токена (JwtAuthGuard).
 */
@ApiTags('friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Отправить запрос на добавление в друзья' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFriendRequestDto): Promise<FriendshipView> {
    return this.friendsService.createRequest(user.id, dto);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Принять запрос (+ автосоздание DIRECT-диалога)' })
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') friendshipId: string): Promise<AcceptFriendResult> {
    return this.friendsService.accept(user.id, friendshipId);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Отклонить запрос' })
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') friendshipId: string): Promise<FriendshipView> {
    return this.friendsService.decline(user.id, friendshipId);
  }

  @Get()
  @ApiOperation({ summary: 'Список активных запросов и принятых связей' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<FriendshipView[]> {
    return this.friendsService.list(user.id);
  }
}
