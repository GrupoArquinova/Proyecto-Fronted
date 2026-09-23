export interface LoginRequest {
    correo: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    nombre?: string;
    email?: string;
    rol?: string;
}

export interface ForgotPasswordRequest {
    correo: string;
}

export interface ResetPasswordRequest {
    token: string;
    nuevaPassword: string;
}