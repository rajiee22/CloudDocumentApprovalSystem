/** Throw this from a route or service to send a specific HTTP status + message to the client. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}
