/**
 * Tipos relacionados con la generación y exportación de reportes financieros.
 */

export type ReportFormat = 'pdf' | 'csv';

export interface ReportConfig {
  format: ReportFormat;
  dateFrom: Date;
  dateTo: Date;
  accountId?: string;
  categoryId?: string;
}

export interface GeneratedReport {
  id: string;
  format: ReportFormat;
  filePath: string;
  fileName: string;
  generatedAt: Date;
  config: ReportConfig;
}
