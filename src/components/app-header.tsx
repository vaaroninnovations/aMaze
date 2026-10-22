import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  FlaskConical,
  FolderKanban,
  LogOut,
  ScanLine,
  Settings,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";
import { Button } from "./ui/button.tsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";
import ThemeToggle from "./theme-toggle.tsx";
import AccountAuthDialog from "./account-auth-dialog.tsx";

const NAV = [
  { to: "/track", label: "Workspace", icon: ScanLine },
  { to: "/experiments", label: "Experiments", icon: FlaskConical },
];
const POST_SIGN_IN_DESTINATION_KEY = "amaze:post-sign-in-destination";

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length
    ? `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase()
    : "U";
}

/** Logo, main navigation and account menu, shared by every page. */
export default function AppHeader({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      sessionStorage.removeItem(POST_SIGN_IN_DESTINATION_KEY);
      return;
    }
    const destination = sessionStorage.getItem(POST_SIGN_IN_DESTINATION_KEY);
    if (!destination) return;
    sessionStorage.removeItem(POST_SIGN_IN_DESTINATION_KEY);
    if (location.pathname !== destination) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-full p-0 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open account menu"
                    title="Account menu"
                  >
                    <Avatar className="size-8 border border-border">
                      <AvatarImage
                        src={user?.imageUrl ?? undefined}
                        alt={user?.name ?? "Account"}
                      />
                      <AvatarFallback
                        delayMs={0}
                        className="bg-primary/15 text-xs font-semibold text-primary"
                      >
                        {user ? initials(user.name) : <UserRound className="size-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-64">
                  <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
                    <Avatar className="size-9">
                      <AvatarImage
                        src={user?.imageUrl ?? undefined}
                        alt={user?.name ?? "Account"}
                      />
                      <AvatarFallback
                        delayMs={0}
                        className="bg-primary/15 text-xs font-semibold text-primary"
                      >
                        {user ? initials(user.name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {user?.name || "Your account"}
                      </span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {user?.email ?? ""}
                      </span>
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/projects">
                      <FolderKanban /> My Projects
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/settings">
                      <Settings /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      void signOut().catch(() =>
                        toast.error("Could not sign out. Please try again."),
                      )
                    }
                  >
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <AccountAuthDialog
              redirectTo={new URL("/track", window.location.origin).toString()}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    sessionStorage.setItem(
                      POST_SIGN_IN_DESTINATION_KEY,
                      "/track",
                    )
                  }
                >
                  <UserRound /> Sign in
                </Button>
              }
            />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
