/**
 * Formata um número para exibição com 2 casas decimais
 * SEM arredondamento — trunca (corta) as casas excedentes.
 * Ex.: 97.666... → "97.66"   |   97.999 → "97.99"
 */
export function formatScore(value: number): string {
  const truncated = Math.trunc(value * 100) / 100;
  return truncated.toFixed(2);
}
