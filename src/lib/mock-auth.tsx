import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  setIsAuthenticated: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: false,
  setIsAuthenticated: () => {},
});

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticatedState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("amaze:is_authenticated") === "true";
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(true);

  const setIsAuthenticated = (val: boolean) => {
    setIsAuthenticatedState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("amaze:is_authenticated", val ? "true" : "false");
    }
  };

  // Sync with Server Session on startup (/api/auth/me)
  useEffect(() => {
    let active = true;
    const checkServerAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (active && data.authenticated && data.user) {
            setIsAuthenticatedState(true);
            localStorage.setItem("amaze:is_authenticated", "true");
            localStorage.setItem(
              "amaze:user_profile",
              JSON.stringify({
                name: data.user.name || "Dr. Alex Morgan",
                email: data.user.email || "a.morgan@cam.ac.uk",
                institution: data.user.institution || "Cambridge Neurobiology Lab",
                orcid: data.user.orcid || "0000-0002-1825-0097",
                provider: data.user.provider || "server",
              }),
            );
          }
        }
      } catch {
        // Standalone/offline mode uses localStorage state
      } finally {
        if (active) setIsLoading(false);
      }
    };

    checkServerAuth();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useConvexAuth() {
  const ctx = useContext(AuthContext);
  return { isAuthenticated: ctx.isAuthenticated, isLoading: ctx.isLoading };
}

export function useAuthActions() {
  const ctx = useContext(AuthContext);
  return {
    signIn: async (provider?: string, params?: any) => {
      if (typeof window !== "undefined" && params) {
        const existing = localStorage.getItem("amaze:user_profile");
        const current = existing ? JSON.parse(existing) : {};
        const updated = {
          ...current,
          name: params.name || current.name || "Dr. Alex Morgan",
          email: params.email || current.email || "a.morgan@cam.ac.uk",
          institution: params.institution || current.institution || "University of Cambridge",
          orcid: params.orcid || current.orcid,
          provider: provider || "local",
        };
        localStorage.setItem("amaze:user_profile", JSON.stringify(updated));

        // Optionally inform server
        try {
          if (params.email) {
            fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(params),
            }).catch(() => {});
          }
        } catch {}
      }
      ctx.setIsAuthenticated(true);
    },
    signOut: async () => {
      ctx.setIsAuthenticated(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("amaze:is_authenticated", "false");
      }
      try {
        fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
      } catch {}
    },
  };
}

export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  return <MockAuthProvider>{children}</MockAuthProvider>;
}
