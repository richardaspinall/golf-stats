// AUTO-GENERATED FILE. DO NOT EDIT.
import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { UpdateRoundPayloadSchema, UpdateRoundOutputSchema } from '../../../../api/gen/rounds/schemas/UpdateRoundSchemas.js';
import type { UpdateRoundOutput, UpdateRoundPayload } from '../../../../api/gen/rounds/types/UpdateRound.js';

export abstract class AbstractUpdateRoundHandler extends BaseHandler<UpdateRoundPayload, UpdateRoundOutput> {
  protected readonly payloadSchema = UpdateRoundPayloadSchema;
  protected readonly outputSchema = UpdateRoundOutputSchema;
}
