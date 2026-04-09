import { AppError, InternalServerError, InvalidRequestPayloadError, InvalidResponsePayloadError } from './AppError.js';
import { ResultError, ResultSuccess } from './HandlerResult.js';
import type { RequestContext } from './RequestContext.js';
import { unknownSchema, type Schema } from './Schema.js';
import { sendJson } from '../../utils/http.js';

export abstract class BaseHandler<TPayload = Record<string, never>, TOutput = unknown> {
  constructor(
    protected readonly ctx: RequestContext,
    protected readonly params: Record<string, string> = {},
  ) {}

  protected readonly payloadSchema: Schema<TPayload> = unknownSchema<TPayload>();
  protected readonly outputSchema: Schema<TOutput> = unknownSchema<TOutput>();

  async handle() {
    try {
      const payload = this.parsePayload(await this.getRawPayload());
      const result = await this.getResult(payload);
      if (result instanceof ResultError) {
        return this.sendError(result.error);
      }

      return this.sendSuccess(this.parseOutput(result.data), result.status);
    } catch (error) {
      return this.sendError(this.toAppError(error));
    }
  }

  protected abstract getResult(payload: TPayload): Promise<ResultSuccess<TOutput> | ResultError<AppError>>;

  protected ok<T>(data: T, status = 200) {
    return new ResultSuccess(data, status);
  }

  protected fail<TError extends AppError>(error: TError) {
    return new ResultError(error);
  }

  private sendSuccess(payload: unknown, status: number) {
    sendJson(this.ctx.res, status, payload);
  }

  private sendError(error: AppError) {
    sendJson(this.ctx.res, error.status, {
      ok: false,
      error: error.message,
    });
  }

  private toAppError(error: unknown) {
    if (error instanceof AppError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return new InternalServerError(message);
  }

  private parsePayload(payload: unknown) {
    try {
      return this.payloadSchema.parse(payload, 'payload');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request payload';
      throw new InvalidRequestPayloadError(message);
    }
  }

  private parseOutput(output: unknown) {
    try {
      return this.outputSchema.parse(output, 'output');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid response payload';
      throw new InvalidResponsePayloadError(message);
    }
  }

  private async getRawPayload() {
    const bodyAwareReq = this.ctx.req as { body?: unknown };
    if (bodyAwareReq.body !== undefined) {
      return bodyAwareReq.body;
    }

    if (this.ctx.method === 'GET' || this.ctx.method === 'DELETE') {
      return {};
    }

    return this.ctx.body();
  }
}
