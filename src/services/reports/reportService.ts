import { Share, Platform } from 'react-native';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import type { ReportConfig, GeneratedReport } from '@/types/reports';
import { useAuthStore } from '@/store/authStore';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

function formatAmount(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es');
}

export class ReportService {
  private generatedReports: Map<string, GeneratedReport> = new Map();

  async generate(config: ReportConfig): Promise<GeneratedReport> {
    try {
      if (config.format === 'pdf') {
        return await this.generatePDF(config);
      }
      return await this.generateCSV(config);
    } catch (error) {
      throw new ReportGenerationError(
        `Error generando reporte: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        config
      );
    }
  }

  async generatePDF(config: ReportConfig): Promise<GeneratedReport> {
    if (Platform.OS === 'web') {
      throw new Error('La generación de PDF no está disponible en web. Usa formato CSV.');
    }

    const transactions = await this.queryTransactions(config);
    const html = this.buildPDFHtml(transactions, config);

    const { generatePDF: convertToPDF } = require('react-native-html-to-pdf');
    const fileName = this.buildFileName(config, 'pdf');
    const result = await convertToPDF({
      html,
      fileName: fileName.replace('.pdf', ''),
      directory: 'Documents',
    });

    if (!result.filePath) throw new Error('No se pudo generar el PDF');

    const report: GeneratedReport = {
      id: generateId(),
      format: 'pdf',
      filePath: result.filePath,
      fileName,
      generatedAt: new Date(),
      config,
    };

    this.generatedReports.set(report.id, report);
    return report;
  }

  async generateCSV(config: ReportConfig): Promise<GeneratedReport> {
    const transactions = await this.queryTransactions(config);

    const csvRows = transactions.map((row: any) => ({
      fecha: formatDate(row.date),
      tipo: row.type === 'income' ? 'Ingreso' : 'Gasto',
      monto: formatAmount(row.amount),
      cuenta: row.accounts?.name ?? '',
      categoría: row.categories?.name ?? '',
      descripción: row.description ?? '',
    }));

    const csvString = Papa.unparse(csvRows, { header: true, delimiter: ',' });
    const fileName = this.buildFileName(config, 'csv');

    let filePath: string;
    if (Platform.OS === 'web') {
      const blob = new Blob([csvString], { type: 'text/csv' });
      filePath = URL.createObjectURL(blob);
      // Auto download on web
      const a = document.createElement('a');
      a.href = filePath;
      a.download = fileName;
      a.click();
    } else {
      const { File: FSFile, Paths } = require('expo-file-system');
      const file = new FSFile(Paths.document, fileName);
      file.write(csvString);
      filePath = file.uri;
    }

    const report: GeneratedReport = {
      id: generateId(),
      format: 'csv',
      filePath,
      fileName,
      generatedAt: new Date(),
      config,
    };

    this.generatedReports.set(report.id, report);
    return report;
  }

  async share(reportId: string, method: 'email' | 'save' | 'share'): Promise<void> {
    const report = this.generatedReports.get(reportId);
    if (!report) throw new Error('Reporte no encontrado.');

    if (method === 'save') return;

    if (Platform.OS === 'web') {
      // On web, the file was already downloaded via blob URL
      return;
    }

    await Share.share({
      title: `Reporte Financiero - ${report.fileName}`,
      url: report.filePath,
    });
  }

  private async queryTransactions(config: ReportConfig) {
    const userId = getUserId();

    let query = supabase
      .from('transactions')
      .select('*, accounts(name), categories(name)')
      .eq('user_id', userId)
      .gte('date', config.dateFrom.toISOString())
      .lte('date', config.dateTo.toISOString())
      .order('date', { ascending: false });

    if (config.accountId) query = query.eq('account_id', config.accountId);
    if (config.categoryId) query = query.eq('category_id', config.categoryId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  private buildPDFHtml(transactions: any[], config: ReportConfig): string {
    const dateFrom = formatDate(config.dateFrom.toISOString());
    const dateTo = formatDate(config.dateTo.toISOString());

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of transactions) {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    }

    const rows = transactions.map((t) => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>${t.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
        <td>$${formatAmount(t.amount)}</td>
        <td>${t.accounts?.name ?? ''}</td>
        <td>${t.categories?.name ?? ''}</td>
        <td>${t.description ?? '-'}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html><html><head><style>
      body{font-family:sans-serif;margin:20px}
      h1{color:#1a73e8}table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#f1f3f4;padding:8px;text-align:left}td{padding:6px 8px;border-bottom:1px solid #eee}
    </style></head><body>
      <h1>Reporte Financiero</h1>
      <p>${dateFrom} - ${dateTo}</p>
      <p>Ingresos: $${formatAmount(totalIncome)} | Gastos: $${formatAmount(totalExpense)} | Balance: $${formatAmount(totalIncome - totalExpense)}</p>
      <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Cuenta</th><th>Categoría</th><th>Descripción</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </body></html>`;
  }

  private buildFileName(config: ReportConfig, ext: string): string {
    const from = config.dateFrom.toISOString().slice(0, 10);
    const to = config.dateTo.toISOString().slice(0, 10);
    return `reporte_${from}_${to}.${ext}`;
  }
}

export class ReportGenerationError extends Error {
  public readonly config: ReportConfig;
  constructor(message: string, config: ReportConfig) {
    super(message);
    this.name = 'ReportGenerationError';
    this.config = config;
  }
}
