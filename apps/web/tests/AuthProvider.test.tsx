import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/services/api", () => ({ api: { auth: { refresh: vi.fn(), login: vi.fn(), logout: vi.fn() } } }));

const refresh = vi.mocked(api.auth.refresh);

function Probe() {
  const { user, isLoading } = useAuth();
  return <p>{isLoading ? "loading" : user ? `signed in as ${user.username}` : "signed out"}</p>;
}

const session = { user: { username: "ada" }, tokens: { accessToken: "t" } } as Awaited<ReturnType<typeof api.auth.refresh>>;

describe("<AuthProvider /> session restore", () => {
  beforeEach(() => vi.resetAllMocks());

  it("restores the session from the refresh cookie", async () => {
    refresh.mockResolvedValue(session);
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("signed in as ada")).toBeInTheDocument();
  });

  it("ends up signed out when there is no valid session", async () => {
    refresh.mockRejectedValue(new Error("Unauthorized"));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("signed out")).toBeInTheDocument();
  });

  it("sends only ONE refresh request even though Strict Mode runs the effect twice", async () => {
    // Refresh tokens rotate on use: a second concurrent refresh with the same cookie would 401
    // and could sign the user out on every page reload.
    refresh.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(session), 20)));
    render(<StrictMode><AuthProvider><Probe /></AuthProvider></StrictMode>);
    await waitFor(() => expect(screen.getByText("signed in as ada")).toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
