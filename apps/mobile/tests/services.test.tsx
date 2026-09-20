import { render, screen, waitFor } from "@testing-library/react-native";
import { StrictMode } from "react";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { InternalAxiosRequestConfig } from "axios";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { apiClient, getAccessToken, setAccessToken } from "@/lib/api-client";
import { api } from "@/services/api";

const secureStore = jest.mocked(SecureStore);

/** Replaces the network with a function; records every request that goes through axios. */
const fakeNetwork = (handler: (config: InternalAxiosRequestConfig) => { status: number; data: unknown }) => {
  const requests: InternalAxiosRequestConfig[] = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    const { status, data } = handler(config);
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) throw Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, config, response });
    return response;
  };
  return requests;
};

describe("mobile API client", () => {
  const original = apiClient.defaults.adapter;
  afterEach(() => {
    apiClient.defaults.adapter = original;
    setAccessToken(null);
  });

  it("identifies itself as the mobile client so the API returns the refresh token in the body", async () => {
    const requests = fakeNetwork(() => ({ status: 200, data: { success: true, data: [] } }));
    await api.catalog.listTcgs();
    expect(requests[0]?.headers.get("x-client-type")).toBe("mobile");
  });

  it("sends the bearer token once set", async () => {
    const requests = fakeNetwork(() => ({ status: 200, data: { success: true, data: [] } }));
    setAccessToken("abc");
    await api.catalog.listTcgs();
    expect(requests[0]?.headers.get("Authorization")).toBe("Bearer abc");
    expect(getAccessToken()).toBe("abc");
  });
});

describe("catalog service", () => {
  const original = apiClient.defaults.adapter;
  afterEach(() => void (apiClient.defaults.adapter = original));

  it("lists cards with the filters as query parameters and returns the paginated payload", async () => {
    const requests = fakeNetwork(() => ({
      status: 200,
      data: { success: true, data: { data: [], pagination: { page: 2, limit: 30, total: 0, totalPages: 1 } } },
    }));
    const result = await api.catalog.listCards({ tcg: "magic", query: "lotus", page: 2, limit: 30 });
    expect(requests[0]?.url).toBe("/cards");
    expect(requests[0]?.params).toEqual({ tcg: "magic", query: "lotus", page: 2, limit: 30 });
    expect(result.pagination.page).toBe(2);
  });

  it("only sends the tcg filter for sets when one is given", async () => {
    const requests = fakeNetwork(() => ({ status: 200, data: { success: true, data: [] } }));
    await api.catalog.listSets();
    await api.catalog.listSets("pokemon");
    expect(requests[0]?.params).toBeUndefined();
    expect(requests[1]?.params).toEqual({ tcg: "pokemon" });
  });

  it("turns an API error envelope into an Error with the server's message", async () => {
    fakeNetwork(() => ({ status: 200, data: { success: false, error: { code: "NOT_FOUND", message: "Set not found" } } }));
    await expect(api.catalog.listSets("x")).rejects.toThrow("Set not found");
  });
});

function Probe() {
  const { user, isLoading } = useAuth();
  return <Text>{isLoading ? "loading" : user ? `signed in as ${user.username}` : "signed out"}</Text>;
}

describe("<AuthProvider /> session restore", () => {
  const original = apiClient.defaults.adapter;
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => void (apiClient.defaults.adapter = original));

  it("stays signed out without a stored refresh token, without calling the API", async () => {
    secureStore.getItemAsync.mockResolvedValue(null);
    const requests = fakeNetwork(() => ({ status: 200, data: {} }));
    await render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("signed out")).toBeTruthy();
    expect(requests).toHaveLength(0);
  });

  it("restores the session from the stored refresh token and stores the rotated one", async () => {
    secureStore.getItemAsync.mockResolvedValue("old-refresh");
    const requests = fakeNetwork(() => ({
      status: 200,
      data: { success: true, data: { user: { username: "ada" }, tokens: { accessToken: "access", refreshToken: "new-refresh" } } },
    }));
    await render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText("signed in as ada")).toBeTruthy();
    expect(requests[0]?.url).toBe("/auth/refresh");
    expect(JSON.parse(requests[0]?.data as string)).toEqual({ refreshToken: "old-refresh" });
    expect(secureStore.setItemAsync).toHaveBeenCalledWith("cardscan_refresh_token", "new-refresh");
    expect(getAccessToken()).toBe("access");
  });

  it("sends only ONE refresh request even when the effect runs twice (Strict Mode)", async () => {
    secureStore.getItemAsync.mockResolvedValue("old-refresh");
    const requests = fakeNetwork(() => ({
      status: 200,
      data: { success: true, data: { user: { username: "ada" }, tokens: { accessToken: "a", refreshToken: "r" } } },
    }));
    await render(<StrictMode><AuthProvider><Probe /></AuthProvider></StrictMode>);
    expect(await screen.findByText("signed in as ada")).toBeTruthy();
    expect(requests.filter((r) => r.url === "/auth/refresh")).toHaveLength(1);
  });

  it("clears a rejected refresh token and ends up signed out", async () => {
    secureStore.getItemAsync.mockResolvedValue("revoked");
    fakeNetwork(() => ({ status: 401, data: { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token" } } }));
    await render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText("signed out")).toBeTruthy());
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("cardscan_refresh_token");
  });
});
