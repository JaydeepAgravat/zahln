import type { ApiErrorCode } from '@zaster/shared';

/** A business error with a stable code the app can switch on. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
  toJSON() {
    return { error: this.code, message: this.message };
  }
}

export const notFound = (what: string) => new ApiError(404, 'not_found', `${what} not found`);
export const forbidden = (message: string) => new ApiError(403, 'forbidden', message);
