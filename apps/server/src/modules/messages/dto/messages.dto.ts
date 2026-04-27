import { createZodDto } from 'nestjs-zod';

import { SendMessageDtoSchema } from '@flare/shared';

/**
 * DTO отправки сообщения.
 * Валидируется через Zod-схему `SendMessageDtoSchema` из `@flare/shared`.
 */
export class SendMessageDto extends createZodDto(SendMessageDtoSchema) {}
