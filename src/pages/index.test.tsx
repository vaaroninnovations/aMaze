import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import Index from "./Index.tsx";
import UserDashboard from "./dashboard/page.tsx";
import LoginPage from "./auth/login.tsx";

// Mock convex auth
vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useAuthActions: () => ({ signOut: vi.fn(), signIn: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => vi.fn(),
}));

describe("Home Page & Dashboard Logo Navigation", () => {
  it("renders home page with Start tracking CTA", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/"]}>
        <Index />
      </MemoryRouter>
    );

    expect(html).toContain("Start tracking");
    expect(html).toContain("Try the demo video");
    expect(html).toContain("Maze");
  });

  it("renders dashboard top nav bar logo linking to home page", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <UserDashboard />
      </MemoryRouter>
    );

    expect(html).toContain('href="/"');
    expect(html).toContain('title="Return to Home"');
  });

  it("renders dedicated login page with ORCID and Google sign-in options", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(html).toContain("Sign In to aMaze");
    expect(html).toContain("Sign in with ORCID");
    expect(html).toContain("Sign in with Google");
    expect(html).toContain("or continue with email");
  });
});
