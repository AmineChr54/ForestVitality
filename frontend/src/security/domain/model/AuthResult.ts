import { AuthResult as AuthResultValues } from "./AuthResultType";
import type { AuthResultType } from "./AuthResultType";

export class AuthResult<T = void> {
  readonly type: AuthResultType;
  readonly message?: string;
  readonly data?: T;

  private constructor(
    type: AuthResultType,
    message?: string,
    data?: T
  ) {
    this.type = type;
    this.message = message;
    this.data = data;
  }

  // === FACTORIES (company-style) ===

  static empty(): AuthResult {
    return new AuthResult(AuthResultValues.EMPTY);
  }

  static success<T>(data?: T, message?: string): AuthResult<T> {
    return new AuthResult(AuthResultValues.SUCCESS, message, data);
  }

  static error(message = "An unexpected error occurred"): AuthResult {
    return new AuthResult(AuthResultValues.ERROR, message);
  }

  static fromError(error: unknown): AuthResult {
    if (error instanceof Error) {
      return AuthResult.error(error.message);
    }
    return AuthResult.error();
  }

  // === UI HELPERS ===

  isSuccess(): boolean {
    return this.type === AuthResultValues.SUCCESS;
  }

  isError(): boolean {
    return this.type === AuthResultValues.ERROR;
  }

  isEmpty(): boolean {
    return this.type === AuthResultValues.EMPTY;
  }
}
