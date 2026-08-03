/**
 * Paleta de colores principal de Planify.
 * Basada en la configuración de Tailwind del proyecto.
 */
export const colors = {
  primary: '#007DC3',
  primaryHover: '#007DC378',
  darkBlue: '#0169A4',

  secondary: '#464646',
  secondaryActive: '#4646461A',

  tertiary: '#F1632A',
  quaternary: '#B7B7B7',

  backgroundPrimary: '#F6F6F5',
  primaryMenu: '#7B7B7B1F',

  greenEarns: '#2EAD5D',
  redExpenses: '#E76666',

  black: '#000000',
  blackLessCard: '#464646',

  contentSettings: '#DCE1E7',
  divSettings: '#B6BABE',

  white: '#FFFFFF',
} as const;

export type ColorKey = keyof typeof colors;
