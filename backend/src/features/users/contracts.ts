import type { InferSchema } from '../../app/http/Schema.js';
import { literalSchema, noPayloadSchema, objectSchema, userSchema } from '../../app/http/contracts.js';

export const getMePayloadSchema = noPayloadSchema;
export type GetMePayload = InferSchema<typeof getMePayloadSchema>;

export const getMeResponseSchema = objectSchema({
  ok: literalSchema(true),
  user: userSchema,
});
export type GetMeResponse = InferSchema<typeof getMeResponseSchema>;

export const publicSignupDisabledPayloadSchema = noPayloadSchema;
export type PublicSignupDisabledPayload = InferSchema<typeof publicSignupDisabledPayloadSchema>;
