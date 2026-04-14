import { createZodDto } from 'nestjs-zod';

import { RegisterDtoSchema } from '@flare/shared';

/**
 * DTO регистрации нового пользователя. Валидируется Zod-схемой из `@flare/shared`.
 * Используется в `POST /auth/register`.
 */
export class RegisterDto extends createZodDto(RegisterDtoSchema) {}
