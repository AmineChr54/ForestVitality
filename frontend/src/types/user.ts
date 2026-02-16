// User and Auth Types

export interface User {
    id: string;
    email: string;
    name: string;
    roles: string[]; // Array of roles from Keycloak
    createdAt: string;
    lastLoginAt?: string;
}

// User Role constants
export const UserRole = {
    ADMIN: 'ADMIN',
    FOREST_ANALYST: 'FOREST_ANALYST',
    DATA_MANAGER: 'DATA_MANAGER',
    VIEWER: 'VIEWER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: User;
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
}
