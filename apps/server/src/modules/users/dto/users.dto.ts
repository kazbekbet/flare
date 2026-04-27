import { createZodDto } from 'nestjs-zod';

import { KeyBackupDtoSchema, UpdateUserDtoSchema } from '@flare/shared';

/**
 * DTO обновления профиля текущего пользователя.
 * Валидируется через Zod-схему `UpdateUserDtoSchema` из `@flare/shared`.
 */
export class UpdateUserDto extends createZodDto(UpdateUserDtoSchema) {}

/**
 * DTO для сохранения зашифрованного бэкапа ключей.
 * Валидируется через Zod-схему `KeyBackupDtoSchema` из `@flare/shared`.
 */
export class KeyBackupDto extends createZodDto(KeyBackupDtoSchema) {}
