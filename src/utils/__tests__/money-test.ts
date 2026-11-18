import { formatMoney, formatPesos } from '@/utils/money';

describe('formatMoney', () => {
  it('sin decimales y con punto de miles', () => {
    expect(formatMoney(98329600)).toBe('$983.296');
    expect(formatMoney(500000)).toBe('$5.000');
    expect(formatMoney(99900)).toBe('$999');
    expect(formatMoney(0)).toBe('$0');
  });

  it('el signo va antes del símbolo', () => {
    expect(formatMoney(-18004700)).toBe('-$180.047');
  });

  it('redondea centavos y no deja "-$0"', () => {
    expect(formatMoney(150)).toBe('$2');
    expect(formatMoney(-40)).toBe('$0');
    expect(formatPesos(123456789.4)).toBe('$123.456.789');
  });
});
