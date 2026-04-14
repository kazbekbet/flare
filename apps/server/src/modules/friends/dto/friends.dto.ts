import { createZodDto } from 'nestjs-zod';

import { CreateFriendRequestDtoSchema } from '@flare/shared';

/**
 * DTO создания запроса на добавление в друзья.
 * Валидируется через Zod-схему `CreateFriendRequestDtoSchema` из `@flare/shared`.
 */
export class CreateFriendRequestDto extends createZodDto(CreateFriendRequestDtoSchema) {}
