import type { WedgeEntry, WedgeMatrix } from '../types';
import { buildWedgeMatrixRows } from './wedgeMatrix';

type WedgeEntriesByMatrix = Record<number, WedgeEntry[]>;

const HEADERS = [
  'Group',
  'Matrix',
  'Calculation mode',
  'Stance width',
  'Grip',
  'Ball position',
  'Ball flight / landing',
  'Notes',
  'Round adjustments',
  'Club',
  'Swing',
  'Value',
  'Distance meters',
  'Shot count',
];

const escapeCsvCell = (value: unknown): string => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildCsvRow = (values: unknown[]): string => values.map(escapeCsvCell).join(',');

export const buildAllWedgeMatricesExportCsv = (
  matrices: WedgeMatrix[],
  entriesByMatrix: WedgeEntriesByMatrix,
): string => {
  const rows = matrices.flatMap((matrix) =>
    buildWedgeMatrixRows(
      entriesByMatrix[matrix.id] ?? [],
      matrix.clubs,
      matrix.swingClocks,
      matrix.calculationMode,
      matrix.setValues,
    ).flatMap((row) =>
      row.cells.map((cell) =>
        buildCsvRow([
          matrix.groupName || 'Ungrouped',
          matrix.name || 'Matrix',
          matrix.calculationMode,
          matrix.stanceWidth,
          matrix.grip,
          matrix.ballPosition,
          matrix.flightAndLanding,
          matrix.notes,
          matrix.currentRoundAdjustments,
          row.club,
          cell.clock,
          cell.displayValue,
          cell.avgMeters,
          cell.count,
        ]),
      ),
    ),
  );

  return [buildCsvRow(HEADERS), ...rows].join('\n');
};

export const buildAllWedgeMatricesExportFilename = (): string => 'all-matrixes-export.csv';

export const downloadWedgeMatricesCsv = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};
