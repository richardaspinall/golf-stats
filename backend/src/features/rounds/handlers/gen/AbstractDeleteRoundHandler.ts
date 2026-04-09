// AUTO-GENERATED FILE. DO NOT EDIT.
import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { DeleteRoundPayloadSchema, DeleteRoundOutputSchema } from '../../../../api/gen/rounds/schemas/DeleteRoundSchemas.js';
import type { DeleteRoundOutput, DeleteRoundPayload } from '../../../../api/gen/rounds/types/DeleteRound.js';

export abstract class AbstractDeleteRoundHandler extends BaseHandler<DeleteRoundPayload, DeleteRoundOutput> {
  protected readonly payloadSchema = DeleteRoundPayloadSchema;
  protected readonly outputSchema = DeleteRoundOutputSchema;
}
