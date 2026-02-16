export const AuthResult = {
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
  EMPTY: "EMPTY",
} as const;
export type AuthResultType = typeof AuthResult[keyof typeof AuthResult];