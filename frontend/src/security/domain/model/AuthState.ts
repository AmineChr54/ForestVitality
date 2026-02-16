import type { User } from "./User";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
