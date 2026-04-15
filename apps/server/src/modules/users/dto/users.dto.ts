import { createZodDto } from 'nestjs-zod';

import { UpdateUserDtoSchema } from '@flare/shared';

/**
 * DTO обновления профиля текущего пользователя.
 * Валидируется через Zod-схему `UpdateUserDtoSchema` из `@flare/shared`.
 */
export class UpdateUserDto extends createZodDto(UpdateUserDtoSchema) {}
