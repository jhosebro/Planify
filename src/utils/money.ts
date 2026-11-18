/**
 * Formatea pesos sin decimales y con punto de miles: -1234567.8 → "-$1.234.568".
 * Sin Intl a propósito: Hermes, Android y los navegadores agrupan distinto según el locale.
 */
export function formatPesos(pesos: number): string {
  const rounded = Math.round(Math.abs(pesos));
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${pesos < 0 && rounded !== 0 ? '-' : ''}$${grouped}`;
}

/** Igual que formatPesos, pero recibe centavos (como se guardan en la base de datos). */
export function formatMoney(centavos: number): string {
  return formatPesos(centavos / 100);
}
