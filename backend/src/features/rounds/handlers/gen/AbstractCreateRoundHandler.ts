// AUTO-GENERATED FILE. DO NOT EDIT.
import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { CreateRoundPayloadSchema, CreateRoundOutputSchema } from '../../../../api/gen/rounds/schemas/CreateRoundSchemas.js';
import type { CreateRoundOutput, CreateRoundPayload } from '../../../../api/gen/rounds/types/CreateRound.js';

export abstract class AbstractCreateRoundHandler extends BaseHandler<CreateRoundPayload, CreateRoundOutput> {
  protected readonly payloadSchema = CreateRoundPayloadSchema;
  protected readonly outputSchema = CreateRoundOutputSchema;
}
