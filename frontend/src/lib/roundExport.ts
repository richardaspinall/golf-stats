import { STAT_SECTIONS } from './constants';
import type { RoundSummaryTotals } from '../types';

export type RoundExportRow = {
  roundDate?: string;
  courseName?: string;
  handicap?: number;
  totals: RoundSummaryTotals;
  completedHolesPar: number;
  completedHolesCount: number;
};

const escapeCsvCell = (value: unknown): string => {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

const buildCsvRow = (values: unknown[]): string => values.map((value) => escapeCsvCell(value)).join(',');

const getSectionExportLabel = (title: string): string => {
  if (title === 'Fairway Hit') {
    return 'Fairway';
  }

  if (title === 'Green in Regulation') {
    return 'GIR';
  }

  if (title === 'Out of Position (OOP)') {
    return 'OOP';
  }

  if (title.startsWith('Inside 100')) {
    return 'Inside 100';
  }

  return title;
};

const statColumns = STAT_SECTIONS.flatMap((section) =>
  section.options.map((option) => ({
    key: option.key,
    label: `${getSectionExportLabel(section.title)} ${option.label}`,
  })),
);

const buildRoundExportHeaderRow = (): string =>
  buildCsvRow([
    'Date',
    'Course',
    'Par',
    'Score',
    'Differential',
    'Stableford',
    'Handicap',
    'Through holes',
    ...statColumns.map((column) => column.label),
  ]);

const buildRoundExportValueRow = ({
  roundDate,
  courseName,
  handicap = 0,
  totals,
  completedHolesPar,
  completedHolesCount,
}: RoundExportRow): string => {
  const scoreDifferential = totals.score - completedHolesPar;

  return buildCsvRow([
    roundDate || '',
    courseName || '',
    totals.par,
    totals.score,
    scoreDifferential,
    totals.stableford,
    handicap,
    completedHolesCount,
    ...statColumns.map((column) => Number(totals[column.key] || 0)),
  ]);
};

export const buildRoundExportCsv = (row: RoundExportRow): string => {
  const headerRow = buildRoundExportHeaderRow();
  const valueRow = buildRoundExportValueRow(row);

  return [headerRow, valueRow].join('\n');
};

export const buildAllRoundsExportCsv = (rows: RoundExportRow[]): string =>
  [buildRoundExportHeaderRow(), ...rows.map((row) => buildRoundExportValueRow(row))].join('\n');

export const buildRoundExportFilename = (roundDate?: string): string => {
  const safeDate = String(roundDate || '')
    .trim()
    .replace(/[^0-9-]+/g, '');

  return `round${safeDate ? `-${safeDate}` : ''}.csv`;
};

export const buildAllRoundsExportFilename = (): string => 'all-rounds-export.csv';

export const downloadRoundExportCsv = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};
