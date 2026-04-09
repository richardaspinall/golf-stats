import { BaseHandler } from '../../../../app/http/BaseHandler.js';
import { noPayloadSchema } from '../../../../app/http/contracts.js';
import { unknownSchema } from '../../../../app/http/Schema.js';
import { getDbDebugStatus } from '../../../../db/debug.js';

type DebugDbResponse = Awaited<ReturnType<typeof getDbDebugStatus>>;

export abstract class AbstractDebugDbHandler extends BaseHandler<Record<string, never>, DebugDbResponse> {
  protected readonly payloadSchema = noPayloadSchema;
  protected readonly outputSchema = unknownSchema<DebugDbResponse>();
}
