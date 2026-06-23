export type ClassValue = string | number | false | null | undefined;

/**
 * Joins conditional class names without introducing an additional runtime dependency.
 */
export function cn(...values: ClassValue[]) {
  return values.filter(Boolean).join(' ');
}
