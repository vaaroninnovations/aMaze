import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { FlaskConical, LogOut, ScanLine, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";
import { Button } from "./ui/button.tsx";
import ThemeToggle from "./theme-toggle.tsx";

const NAV = [
  { to: "/track", label: "Workspace", icon: ScanLine },
  { to: "/experiments", label: "Experiments", icon: FlaskConical },
];

/** Logo, main navigation and account menu, shared by every page. */
export default function AppHeader({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const navItems = isAuthenticated
    ? NAV.filter((item) => item.to === "/track")
    : [];

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            to="/"
            className="flex shrink-0 cursor-pointer items-center gap-2.5"
          >
            <span className="grid size-7 place-items-center rounded-md border border-[#08796f]/30 bg-[#08796f]/[0.07] text-[#08796f] dark:border-[#68dfce]/30 dark:bg-[#48cdbb]/10 dark:text-[#59dbc7]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-[18px]"
              >
                <path
                  d="M4 4h16v16H4zM8 4v5h4v6h4v5M12 9h4v4M8 15h4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="square"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-sans text-[15px] font-semibold tracking-[-0.04em]">
              α<span className="text-[#08796f] dark:text-[#59dbc7]">Maze</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                    isActive && "bg-secondary text-foreground",
                  )
                }
              >
                <n.icon className="size-4" />
                <span className="hidden md:inline">{n.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {children}
          {isAuthenticated ? (
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/profile">
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <UserRound />
                  )}
                  <span className="hidden max-w-32 truncate sm:inline">
                    {user?.name ?? "Profile"}
                  </span>
                </Link>
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Sign out"
                title="Sign out"
                onClick={() =>
                  void signOut().catch(() =>
                    toast.error("Could not sign out. Please try again."),
                  )
                }
              >
                <LogOut />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() =>
                void signIn("google", {
                  redirectTo: window.location.href,
                }).catch(() => toast.error("Could not start Google sign-in."))
              }
            >
              <UserRound /> Sign in
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
