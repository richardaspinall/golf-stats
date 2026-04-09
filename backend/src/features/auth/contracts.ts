import type { InferSchema } from '../../app/http/Schema.js';
import { literalSchema, numberSchema, objectSchema, optionalUnknownSchema, stringSchema, userSchema } from '../../app/http/contracts.js';

export const loginPayloadSchema = objectSchema({
  username: optionalUnknownSchema,
  password: optionalUnknownSchema,
});
export type LoginPayload = InferSchema<typeof loginPayloadSchema>;

export const authSuccessResponseSchema = objectSchema({
  ok: literalSchema(true),
  token: stringSchema(),
  user: userSchema,
  expiresIn: numberSchema(),
});
export type AuthSuccessResponse = InferSchema<typeof authSuccessResponseSchema>;

export const googleLoginPayloadSchema = objectSchema({
  idToken: optionalUnknownSchema,
});
export type GoogleLoginPayload = InferSchema<typeof googleLoginPayloadSchema>;

export const linkGooglePayloadSchema = objectSchema({
  idToken: optionalUnknownSchema,
});
export type LinkGooglePayload = InferSchema<typeof linkGooglePayloadSchema>;

export const linkGoogleResponseSchema = objectSchema({
  ok: literalSchema(true),
  user: userSchema,
});
export type LinkGoogleResponse = InferSchema<typeof linkGoogleResponseSchema>;
