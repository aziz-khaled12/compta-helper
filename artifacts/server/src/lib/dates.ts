export function toIsoDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.length >= 10 ? value.slice(0, 10) : value;
}
