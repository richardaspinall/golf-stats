type RoundDisplayInput = {
  roundDate?: string;
  courseName?: string;
};

export const formatRoundDisplayLabel = ({ roundDate, courseName }: RoundDisplayInput): string => {
  const parts = [roundDate, courseName].filter((value): value is string => Boolean(value && String(value).trim()));
  return parts.join(' | ') || 'Untitled round';
};
