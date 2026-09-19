import type { ApiResponse, AuthSession, AuthUser } from "@cardscan/types";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@cardscan/validation";
import { apiClient } from "@/lib/api-client";
import { getStoredRefreshToken } from "@/utils/secureStorage";

const unwrap = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.error.message);
  }
  return response.data;
};

export const authApi = {
  register: async (input: RegisterInput) => {
    const { data } = await apiClient.post<ApiResponse<AuthSession>>("/auth/register", input);
    return unwrap(data);
  },
  login: async (input: LoginInput) => {
    const { data } = await apiClient.post<ApiResponse<AuthSession>>("/auth/login", input);
    return unwrap(data);
  },
  logout: async () => {
    const refreshToken = await getStoredRefreshToken();
    const { data } = await apiClient.post<ApiResponse<{ loggedOut: true }>>("/auth/logout", {
      refreshToken,
    });
    return unwrap(data);
  },
  refresh: async () => {
    const refreshToken = await getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error("No stored refresh token");
    }
    const { data } = await apiClient.post<ApiResponse<AuthSession>>("/auth/refresh", {
      refreshToken,
    });
    return unwrap(data);
  },
  me: async () => {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>("/auth/me");
    return unwrap(data);
  },
  forgotPassword: async (input: ForgotPasswordInput) => {
    const { data } = await apiClient.post<ApiResponse<{ sent: true }>>(
      "/auth/forgot-password",
      input,
    );
    return unwrap(data);
  },
  resetPassword: async (input: ResetPasswordInput) => {
    const { data } = await apiClient.post<ApiResponse<{ reset: true }>>(
      "/auth/reset-password",
      input,
    );
    return unwrap(data);
  },
};
