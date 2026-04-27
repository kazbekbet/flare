import { createZodDto } from 'nestjs-zod';

import { LoginDtoSchema, RegisterDtoSchema } from '@flare/shared';

/**
 * DTO регистрации нового пользователя. Валидируется Zod-схемой из `@flare/shared`.
 * Используется в `POST /auth/register`.
 */
export class RegisterDto extends createZodDto(RegisterDtoSchema) {}

/**
 * DTO входа по challenge-подписи. Валидируется Zod-схемой из `@flare/shared`.
 * Используется в `POST /auth/login`.
 */
export class LoginDto extends createZodDto(LoginDtoSchema) {}
