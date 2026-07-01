interface ErrorWithMetadata {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  status?: number;
  statusCode?: number;
  error_description?: string;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringifyUnknown(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getNumericStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const value = (error.status ?? error.statusCode) as unknown;
  return typeof value === 'number' ? value : undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  const isNetworkError = (msg: string) => {
    const lower = msg.toLowerCase();
    return lower.includes('failed to fetch') || lower.includes('fetch failed') || lower.includes('net::err');
  };

  const networkFallback = 'Unable to connect to the server. Please check your internet connection and try again.';

  if (error instanceof Error && error.message) {
    if (isNetworkError(error.message)) {
      return networkFallback;
    }
    return error.message;
  }

  if (isRecord(error)) {
    const errorLike = error as ErrorWithMetadata;
    if (typeof errorLike.message === 'string' && errorLike.message.trim().length > 0) {
      if (isNetworkError(errorLike.message)) {
        return networkFallback;
      }
      return errorLike.message;
    }

    if (typeof errorLike.error_description === 'string' && errorLike.error_description.trim().length > 0) {
      if (isNetworkError(errorLike.error_description)) {
        return networkFallback;
      }
      return errorLike.error_description;
    }

    if (typeof errorLike.error === 'string' && errorLike.error.trim().length > 0) {
      if (isNetworkError(errorLike.error)) {
        return networkFallback;
      }
      return errorLike.error;
    }
  }

  return fallback;
}

export function getErrorLogContext(error: unknown): Record<string, unknown> {
  const message = getErrorMessage(error, 'Unknown error');
  const status = getNumericStatus(error);
  const code = getErrorCode(error);
  const serialized = stringifyUnknown(error);

  if (error instanceof Error) {
    return {
      name: error.name,
      message,
      code,
      status,
      serialized,
      stack: error.stack,
    };
  }

  if (isRecord(error)) {
    const errorLike = error as ErrorWithMetadata;
    return {
      message,
      details: errorLike.details,
      hint: errorLike.hint,
      code,
      status,
      serialized,
      raw: error,
    };
  }

  return {
    message,
    status,
    code,
    serialized,
    raw: error,
  };
}

export function isAuthOrPermissionError(error: unknown): boolean {
  const status = getNumericStatus(error);
  if (status === 401 || status === 403) {
    return true;
  }

  const code = (getErrorCode(error) ?? '').toUpperCase();
  if (code === '42501') {
    return true;
  }

  const message = getErrorMessage(error, '').toLowerCase();
  return (
    message.includes('auth') ||
    message.includes('jwt') ||
    message.includes('permission') ||
    message.includes('row-level security') ||
    message.includes('rls') ||
    message.includes('session')
  );
}

export function isMissingDatabaseObjectError(error: unknown): boolean {
  const code = (getErrorCode(error) ?? '').toUpperCase();
  if (code === '42P01' || code === '42703') {
    return true;
  }

  const message = getErrorMessage(error, '').toLowerCase();
  return (
    (message.includes('relation') && message.includes('does not exist')) ||
    (message.includes('column') && message.includes('does not exist')) ||
    message.includes('undefined column')
  );
}
