import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { type AuthenticatedUser } from '../../common/types/authenticated.types.js';
import { UpdateUserDto } from './dto/users.dto.js';
import { type PrivateUserProfile, UsersService } from './users.service.js';

/**
 * REST-эндпоинты для управления собственным профилем и чтения публичных ключей.
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить собственный профиль' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<PrivateUserProfile> {
    return this.usersService.getPrivateProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить собственный профиль (частичное обновление)' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto): Promise<PrivateUserProfile> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get(':id/public-key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить публичный ключ пользователя для E2E-шифрования' })
  publicKey(@Param('id') id: string): Promise<{ userId: string; publicKey: string }> {
    return this.usersService.getPublicKey(id);
  }
}
