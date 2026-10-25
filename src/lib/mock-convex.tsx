import type { ReactNode } from "react";

export function useQuery(_query: any, ..._args: any[]) {
  if (_args[0] === "skip") return null;

  if (typeof window !== "undefined") {
    const isAuth = localStorage.getItem("amaze:is_authenticated") === "true";
    if (!isAuth) return null;

    const saved = localStorage.getItem("amaze:user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          _id: "user-current",
          name: parsed.name || "Dr. Alex Morgan",
          email: parsed.email || "a.morgan@cam.ac.uk",
          institution: parsed.institution || "University of Cambridge",
          department: parsed.department || "Dept. of Physiology, Development & Neuroscience",
          role: parsed.role || "Senior Behavioral Neurobiologist",
          orcid: parsed.orcid || "0000-0002-1825-0097",
          preferences: { landingPage: "/dashboard" },
        };
      } catch (e) {
        // ignore parse error
      }
    }
    return {
      _id: "user-current",
      name: "Dr. Alex Morgan",
      email: "a.morgan@cam.ac.uk",
      institution: "University of Cambridge",
      department: "Dept. of Physiology, Development & Neuroscience",
      role: "Senior Behavioral Neurobiologist",
      orcid: "0000-0002-1825-0097",
      preferences: { landingPage: "/dashboard" },
    };
  }

  return null;
}

export function useMutation(_mutation: any) {
  return async () => {};
}

export function useAction(_action: any) {
  return async () => {};
}

export class ConvexReactClient {
  constructor(_url: string) {}
}

export function ConvexProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
