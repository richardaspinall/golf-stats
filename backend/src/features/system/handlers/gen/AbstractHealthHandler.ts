import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { literalSchema, noPayloadSchema, objectSchema } from '../../../../app/http/contracts.js';

export abstract class AbstractHealthHandler extends BaseHandler<Record<string, never>, { ok: true }> {
  protected readonly payloadSchema = noPayloadSchema;
  protected readonly outputSchema = objectSchema({ ok: literalSchema(true) });
}
