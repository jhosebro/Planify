import { supabase } from '@/lib/supabase';
import { adjustAccountBalance } from '@/services/accounts/accountService';
import { getCurrentMonthPeriodKey, isWithinCurrentMonth } from '@/services/budgets/monthlyPeriod';
import { summarizeDebts, type Debt } from '@/services/debts/debtService';
import { TransferService } from '@/services/transfers/transferService';

jest.mock('@/store/authStore', () => ({ useAuthStore: { getState: () => ({ userId: 'u1' }) } }));

// Query builder falso: cada método encadena y el await resuelve con lo que devuelva `mockRespond`.
type Call = { table: string; ops: [string, unknown[]][] };
let mockCalls: Call[] = [];
let mockRespond: (c: Call) => unknown = () => ({ data: null, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn((table: string) => {
      const call: Call = { table, ops: [] };
      mockCalls.push(call);
      const builder: any = new Proxy(
        {},
        {
          get: (_t, prop: string) =>
            prop === 'then'
              ? (res: any, rej: any) => Promise.resolve(mockRespond(call)).then(res, rej)
              : (...args: unknown[]) => (call.ops.push([prop, args]), builder),
        },
      );
      return builder;
    }),
  },
}));

const rpc = supabase.rpc as jest.Mock;

beforeEach(() => {
  mockCalls = [];
  mockRespond = () => ({ data: null, error: null });
  rpc.mockReset().mockResolvedValue({ error: null });
});

function debt(over: Partial<Debt>): Debt {
  return {
    id: 'd', userId: 'u1', category: 'personal', direction: 'i_owe', name: 'x',
    totalAmount: 10000, paidAmount: 0, isProvisioned: false, status: 'active',
    createdAt: new Date(), updatedAt: new Date(), ...over,
  };
}

describe('summarizeDebts', () => {
  it('suma lo pendiente por dirección y categoría, ignorando pagadas', () => {
    const s = summarizeDebts([
      debt({ category: 'credit_card', totalAmount: 50000, paidAmount: 20000 }),
      debt({ category: 'installment', totalAmount: 30000, paidAmount: 0 }),
      debt({ category: 'personal', totalAmount: 10000, paidAmount: 2500 }),
      debt({ direction: 'they_owe_me', totalAmount: 8000, paidAmount: 3000 }),
      debt({ status: 'paid_off', totalAmount: 99999 }),
    ]);
    expect(s).toEqual({
      totalIOwe: 30000 + 30000 + 7500,
      totalTheyOweMe: 5000,
      creditCardDebt: 30000,
      installmentDebt: 30000,
      personalDebt: 7500,
    });
  });

  it('las provisionadas no cuentan en totalIOwe pero sí en su categoría', () => {
    const s = summarizeDebts([debt({ category: 'credit_card', totalAmount: 4000, isProvisioned: true })]);
    expect(s.totalIOwe).toBe(0);
    expect(s.creditCardDebt).toBe(4000);
  });

  it('lista vacía da todo en cero', () => {
    expect(summarizeDebts([])).toEqual({
      totalIOwe: 0, totalTheyOweMe: 0, creditCardDebt: 0, installmentDebt: 0, personalDebt: 0,
    });
  });
});

describe('adjustAccountBalance', () => {
  it('delta 0 no toca la base de datos', async () => {
    await adjustAccountBalance('a1', 0);
    expect(rpc).not.toHaveBeenCalled();
    expect(mockCalls).toHaveLength(0);
  });

  it('usa la RPC atómica cuando está disponible', async () => {
    await adjustAccountBalance('a1', -1500);
    expect(rpc).toHaveBeenCalledWith('update_account_balance', { p_account_id: 'a1', p_delta: -1500 });
    expect(mockCalls).toHaveLength(0);
  });

  it('si la RPC falla, lee y escribe saldo + delta', async () => {
    rpc.mockResolvedValue({ error: { message: 'no existe' } });
    mockRespond = (c) =>
      c.ops.some(([op]) => op === 'select') ? { data: { balance: 10000 }, error: null } : { error: null };
    await adjustAccountBalance('a1', -2500);
    const update = mockCalls[1].ops.find(([op]) => op === 'update')!;
    expect((update[1][0] as any).balance).toBe(7500);
  });

  it('lanza si no puede leer el saldo', async () => {
    rpc.mockResolvedValue({ error: { message: 'x' } });
    mockRespond = () => ({ data: null, error: { message: 'boom' } });
    await expect(adjustAccountBalance('a1', 100)).rejects.toThrow('No se pudo leer el saldo');
  });
});

describe('TransferService.create', () => {
  const service = new TransferService();
  const input = { sourceAccountId: 'src', destinationAccountId: 'dst', amount: 12345, date: new Date('2026-11-10') };

  it('resta en origen y suma en destino el mismo monto', async () => {
    mockRespond = (c) => {
      if (c.table === 'categories') return { data: { id: 'cat' }, error: null };
      if (c.table === 'accounts') return { data: { name: 'Cuenta' }, error: null };
      if (c.table === 'transfers') return { data: { id: 't1', date: '2026-11-10', created_at: '2026-11-10' }, error: null };
      return { data: { id: `tx${mockCalls.length}` }, error: null };
    };
    const { transfer } = await service.create(input, true);
    expect(rpc.mock.calls).toEqual([
      ['update_account_balance', { p_account_id: 'src', p_delta: -12345 }],
      ['update_account_balance', { p_account_id: 'dst', p_delta: 12345 }],
    ]);
    expect(transfer.amount).toBe(12345);
  });

  it('rechaza misma cuenta y montos no positivos sin tocar saldos', async () => {
    await expect(service.create({ ...input, destinationAccountId: 'src' }, true)).rejects.toThrow('diferentes');
    await expect(service.create({ ...input, amount: 0 }, true)).rejects.toThrow('mayor a cero');
    await expect(service.create({ ...input, amount: -5 }, true)).rejects.toThrow('mayor a cero');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('periodo mensual de presupuestos', () => {
  afterEach(() => jest.useRealTimers());

  it('la clave del mes va con cero a la izquierda', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 15));
    expect(getCurrentMonthPeriodKey()).toBe('2026-01');
    jest.setSystemTime(new Date(2026, 11, 31, 23, 59));
    expect(getCurrentMonthPeriodKey()).toBe('2026-12');
  });

  it('isWithinCurrentMonth distingue el mes actual de los anteriores', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 18));
    expect(isWithinCurrentMonth(new Date(2026, 10, 1).toISOString())).toBe(true);
    expect(isWithinCurrentMonth(new Date(2026, 9, 31).toISOString())).toBe(false);
    expect(isWithinCurrentMonth(new Date(2025, 10, 18).toISOString())).toBe(false);
  });

  it('sin fecha o fecha inválida se trata como mes actual', () => {
    expect(isWithinCurrentMonth(null)).toBe(true);
    expect(isWithinCurrentMonth(undefined)).toBe(true);
    expect(isWithinCurrentMonth('no-es-fecha')).toBe(true);
  });
});
