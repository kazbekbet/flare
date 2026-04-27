import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConversationsModule } from '../conversations/conversations.module.js';
import { Friendship, FriendshipSchema } from '../mongoose/schemas/friendship.schema.js';
import { User, UserSchema } from '../mongoose/schemas/user.schema.js';
import { FriendsController } from './friends.controller.js';
import { FriendsService } from './friends.service.js';

/**
 * Модуль управления связями дружбы.
 * Зависит от `ConversationsModule` (автосоздание DIRECT при accept).
 * События публикуются в глобальный EventBusService — прямой зависимости от Gateway нет.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Friendship.name, schema: FriendshipSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ConversationsModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
