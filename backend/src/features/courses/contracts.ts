import type { InferSchema } from '../../app/http/Schema.js';
import { arraySchema, courseSchema, literalSchema, noPayloadSchema, objectSchema, optionalUnknownSchema } from '../../app/http/contracts.js';

export const listCoursesPayloadSchema = noPayloadSchema;
export type ListCoursesPayload = InferSchema<typeof listCoursesPayloadSchema>;

export const listCoursesResponseSchema = objectSchema({
  ok: literalSchema(true),
  courses: arraySchema(courseSchema),
});
export type ListCoursesResponse = InferSchema<typeof listCoursesResponseSchema>;

export const getCoursePayloadSchema = noPayloadSchema;
export type GetCoursePayload = InferSchema<typeof getCoursePayloadSchema>;

export const getCourseResponseSchema = objectSchema({
  ok: literalSchema(true),
  course: courseSchema,
});
export type GetCourseResponse = InferSchema<typeof getCourseResponseSchema>;

export const createCoursePayloadSchema = objectSchema({
  name: optionalUnknownSchema,
  markers: optionalUnknownSchema,
});
export type CreateCoursePayload = InferSchema<typeof createCoursePayloadSchema>;

export const createCourseResponseSchema = getCourseResponseSchema;
export type CreateCourseResponse = InferSchema<typeof createCourseResponseSchema>;

export const updateCoursePayloadSchema = createCoursePayloadSchema;
export type UpdateCoursePayload = InferSchema<typeof updateCoursePayloadSchema>;

export const updateCourseResponseSchema = getCourseResponseSchema;
export type UpdateCourseResponse = InferSchema<typeof updateCourseResponseSchema>;
