type ParseFn<T> = (value: unknown, path: string) => T;

export type Schema<T> = {
  parse: ParseFn<T>;
};

export type InferSchema<TSchema extends Schema<unknown>> = TSchema extends Schema<infer TValue> ? TValue : never;

const fail = (path: string, expected: string): never => {
  throw new Error(`${path} must be ${expected}`);
};

export const schema = <T>(parse: ParseFn<T>): Schema<T> => ({
  parse,
});

export const stringSchema = () =>
  schema<string>((value, path) => {
    if (typeof value !== 'string') {
      fail(path, 'a string');
    }
    return value as string;
  });

export const numberSchema = () =>
  schema<number>((value, path) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      fail(path, 'a finite number');
    }
    return value as number;
  });

export const booleanSchema = () =>
  schema<boolean>((value, path) => {
    if (typeof value !== 'boolean') {
      fail(path, 'a boolean');
    }
    return value as boolean;
  });

export const literalSchema = <TLiteral extends string | number | boolean | null>(literal: TLiteral) =>
  schema<TLiteral>((value, path) => {
    if (value !== literal) {
      fail(path, JSON.stringify(literal));
    }
    return literal;
  });

export const unknownSchema = <T = unknown>() => schema<T>((value) => value as T);

export const optionalSchema = <T>(inner: Schema<T>) =>
  schema<T | undefined>((value, path) => {
    if (value === undefined) {
      return undefined;
    }
    return inner.parse(value, path);
  });

export const nullableSchema = <T>(inner: Schema<T>) =>
  schema<T | null>((value, path) => {
    if (value === null) {
      return null;
    }
    return inner.parse(value, path);
  });

export const arraySchema = <T>(inner: Schema<T>) =>
  schema<T[]>((value, path) => {
    if (!Array.isArray(value)) {
      fail(path, 'an array');
    }
    const entries = value as unknown[];
    return entries.map((entry, index) => inner.parse(entry, `${path}[${index}]`));
  });

export const recordSchema = <T>(inner: Schema<T>) =>
  schema<Record<string, T>>((value, path) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(path, 'an object');
    }

    const record = value as Record<string, unknown>;
    return Object.entries(record).reduce<Record<string, T>>((acc, [key, entry]) => {
      acc[key] = inner.parse(entry, `${path}.${key}`);
      return acc;
    }, {});
  });

export const objectSchema = <TShape extends Record<string, Schema<unknown>>>(shape: TShape) =>
  schema<{ [K in keyof TShape]: InferSchema<TShape[K]> }>((value, path) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(path, 'an object');
    }

    const record = value as Record<string, unknown>;
    const output = {} as { [K in keyof TShape]: InferSchema<TShape[K]> };
    for (const key of Object.keys(shape) as Array<keyof TShape>) {
      output[key] = shape[key].parse(record[key as string], `${path}.${String(key)}`) as InferSchema<TShape[typeof key]>;
    }
    return output;
  });

export const customSchema = <T>(name: string, predicate: (value: unknown) => boolean) =>
  schema<T>((value, path) => {
    if (!predicate(value)) {
      fail(path, name);
    }
    return value as T;
  });

export const emptyObjectSchema = () =>
  schema<Record<string, never>>((value, path) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(path, 'an object');
    }
    return {};
  });
