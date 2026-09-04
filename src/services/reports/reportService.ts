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
    const transactions = await this.queryTransactions(config);
    const debts = await this.queryDebts();
    const html = this.buildPDFHtml(transactions, debts, config);
    const fileName = this.buildFileName(config, 'pdf');

    if (Platform.OS === 'web') {
      // On web, open a print dialog with the HTML content
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('No se pudo abrir la ventana de impresión. Desbloquea popups.');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();

      const report: GeneratedReport = {
        id: generateId(),
        format: 'pdf',
        filePath: '',
        fileName,
        generatedAt: new Date(),
        config,
      };
      this.generatedReports.set(report.id, report);
      return report;
    }

    const { generatePDF: convertToPDF } = require('react-native-html-to-pdf');
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
    const debts = await this.queryDebts();

    const csvRows = transactions.map((row: any) => ({
      fecha: formatDate(row.date),
      tipo: row.type === 'income' ? 'Ingreso' : 'Gasto',
      monto: formatAmount(row.amount),
      cuenta: row.accounts?.name ?? '',
      categoría: row.categories?.name ?? '',
      descripción: row.description ?? '',
    }));

    // Add debt rows as a separate section
    const debtRows = debts.map((d: any) => ({
      fecha: '',
      tipo: 'DEUDA',
      monto: formatAmount(d.total_amount - d.paid_amount),
      cuenta: d.name,
      categoría: d.category === 'credit_card' ? 'Tarjeta' : d.category === 'installment' ? 'Cuotas' : 'Personal',
      descripción: d.total_installments ? `Cuota ${d.paid_installments ?? 0}/${d.total_installments}` : (d.direction === 'they_owe_me' ? 'Me deben' : 'Yo debo'),
    }));

    const allRows = [...csvRows, ...debtRows];
    const csvString = Papa.unparse(allRows, { header: true, delimiter: ',' });
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
      .is('linked_transfer_id', null)
      .gte('date', config.dateFrom.toISOString())
      .lte('date', config.dateTo.toISOString())
      .order('date', { ascending: false });

    if (config.accountId) query = query.eq('account_id', config.accountId);
    if (config.categoryId) query = query.eq('category_id', config.categoryId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  private async queryDebts() {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('category')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data ?? [];
  }

  private buildPDFHtml(transactions: any[], debts: any[], config: ReportConfig): string {
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

    const debtCategoryLabels: Record<string, string> = { credit_card: 'Tarjeta de Crédito', installment: 'Cuotas', personal: 'Personal' };
    const debtRows = debts.map((d: any) => {
      const remaining = d.total_amount - d.paid_amount;
      const progress = d.total_amount > 0 ? ((d.paid_amount / d.total_amount) * 100).toFixed(0) : '0';
      return `
        <tr>
          <td>${d.name}</td>
          <td>${debtCategoryLabels[d.category] ?? d.category}</td>
          <td>${d.direction === 'i_owe' ? 'Debo' : 'Me deben'}</td>
          <td>$${formatAmount(d.total_amount)}</td>
          <td>$${formatAmount(remaining)}</td>
          <td>${progress}%</td>
          <td>${d.total_installments ? `${d.paid_installments ?? 0}/${d.total_installments}` : '-'}</td>
        </tr>
      `;
    }).join('');

    const totalDebt = debts
      .filter((d: any) => d.direction === 'i_owe')
      .reduce((sum: number, d: any) => sum + (d.total_amount - d.paid_amount), 0);
    const totalReceivable = debts
      .filter((d: any) => d.direction === 'they_owe_me')
      .reduce((sum: number, d: any) => sum + (d.total_amount - d.paid_amount), 0);

    return `<!DOCTYPE html><html><head><style>
      body{font-family:sans-serif;margin:20px;color:#333}
      h1{color:#1a73e8}h2{color:#333;margin-top:30px;border-bottom:2px solid #1a73e8;padding-bottom:6px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
      th{background:#f1f3f4;padding:8px;text-align:left}td{padding:6px 8px;border-bottom:1px solid #eee}
      .summary{display:flex;gap:20px;margin:10px 0}.summary-item{background:#f8f9fa;padding:12px 16px;border-radius:8px}
      .summary-label{font-size:11px;color:#666}.summary-value{font-size:18px;font-weight:700}
      @media print{body{margin:0}h1{font-size:18px}}
    </style></head><body>
      <h1>Reporte Financiero - Planify</h1>
      <p>${dateFrom} — ${dateTo}</p>
      <div class="summary">
        <div class="summary-item"><div class="summary-label">Ingresos</div><div class="summary-value" style="color:#2EAD5D">$${formatAmount(totalIncome)}</div></div>
        <div class="summary-item"><div class="summary-label">Gastos</div><div class="summary-value" style="color:#E76666">$${formatAmount(totalExpense)}</div></div>
        <div class="summary-item"><div class="summary-label">Balance</div><div class="summary-value">$${formatAmount(totalIncome - totalExpense)}</div></div>
      </div>

      <h2>Movimientos (${transactions.length})</h2>
      <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Cuenta</th><th>Categoría</th><th>Descripción</th></tr></thead>
      <tbody>${rows}</tbody></table>

      ${debts.length > 0 ? `
        <h2>Deudas Activas (${debts.length})</h2>
        <p>Total pendiente: <strong>$${formatAmount(totalDebt)}</strong> | Por cobrar: <strong>$${formatAmount(totalReceivable)}</strong></p>
        <table><thead><tr><th>Nombre</th><th>Tipo</th><th>Dirección</th><th>Total</th><th>Pendiente</th><th>Progreso</th><th>Cuotas</th></tr></thead>
        <tbody>${debtRows}</tbody></table>
      ` : ''}
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
