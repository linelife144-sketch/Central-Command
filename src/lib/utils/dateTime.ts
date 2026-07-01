export const DATE_TIME_LOCAL_24H_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const DATE_TIME_LOCAL_WITH_SECONDS_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
const DATE_TIME_SPACE_24H_PATTERN = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/;

export function toDateTimeLocal24(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function normalizeDateTimeLocal24(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  if (DATE_TIME_LOCAL_24H_PATTERN.test(raw)) {
    return raw;
  }

  if (DATE_TIME_LOCAL_WITH_SECONDS_PATTERN.test(raw)) {
    return raw.slice(0, 16);
  }

  if (DATE_TIME_SPACE_24H_PATTERN.test(raw)) {
    return raw.replace(' ', 'T');
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return toDateTimeLocal24(parsed);
}
