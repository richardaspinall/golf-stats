export const toIso = (value: unknown) => {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value as string);
  return Number.isNaN(parsed.valueOf()) ? new Date().toISOString() : parsed.toISOString();
};
