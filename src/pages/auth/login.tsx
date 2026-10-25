import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  IdCard,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  UserRound,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle.tsx";
import SiteFooter from "@/components/site-footer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

const POST_SIGN_IN_DESTINATION_KEY = "amaze:post-sign-in-destination";

function OrcidIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="128" cy="128" r="128" fill="#A6CE39" />
      <path
        fill="#FFFFFF"
        d="M86.3 186.2H70.9V79.1h15.4v107.1zM78.6 65.4c-5.3 0-9.6-4.3-9.6-9.6s4.3-9.6 9.6-9.6 9.6 4.3 9.6 9.6-4.3 9.6-9.6 9.6zm44.2 120.8h-15.4V79.1h15.4v14.8c6.1-9.9 17.6-16.7 30.5-16.7 24.3 0 42.4 17.5 42.4 49.3 0 31.9-18.1 49.7-42.4 49.7-12.9 0-24.4-6.8-30.5-16.7v14.8zm23.6-14c16.3 0 27.6-12.6 27.6-35.7s-11.3-35.7-27.6-35.7-27.6 12.6-27.6 35.7 11.3 35.7 27.6 35.7z"
      />
    </svg>
  );
}

interface LoginPageProps {
  defaultMode?: "signIn" | "signUp";
}

export default function LoginPage({ defaultMode = "signIn" }: LoginPageProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlMode = searchParams.get("mode");
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">(
    urlMode === "signup" || defaultMode === "signUp" ? "signUp" : "signIn"
  );

  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  // Form Fields
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [orcid, setOrcid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ORCID Modal Simulation State
  const [isOrcidAuthOpen, setIsOrcidAuthOpen] = useState(false);
  const [orcidInputId, setOrcidInputId] = useState("0000-0002-1825-0097");

  // If already authenticated, forward to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  const rememberDestination = () => {
    if (!redirectTo) return;
    try {
      const destination = new URL(redirectTo, window.location.origin);
      if (destination.origin === window.location.origin) {
        sessionStorage.setItem(
          POST_SIGN_IN_DESTINATION_KEY,
          `${destination.pathname}${destination.search}${destination.hash}`
        );
      }
    } catch {
      sessionStorage.setItem(POST_SIGN_IN_DESTINATION_KEY, redirectTo);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "signUp") {
      if (!name.trim()) {
        toast.error("Please enter your full name.");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (!acceptedTerms) {
        toast.error("Please accept the Terms of Service.");
        return;
      }
    }

    setSubmitting(true);
    rememberDestination();

    try {
      if (mode === "reset") {
        await signIn("password", {
          flow: "reset",
          email: email.trim(),
          redirectTo: "/reset-password",
        });
        toast.success("Password reset link sent! Check your institutional email.");
        setMode("signIn");
        return;
      }

      if (mode === "signUp") {
        await signIn("password", {
          flow: "signUp",
          name: name.trim(),
          institution: institution.trim() || "University Research Lab",
          email: email.trim(),
          orcid: orcid.trim(),
          password,
        });

        toast.success(`Account created! Welcome, ${name.trim() || "Researcher"}.`, {
          description: "Redirecting to your research dashboard...",
        });
      } else {
        await signIn("password", {
          flow: "signIn",
          email: email.trim(),
          password,
        });

        toast.success("Welcome back!", {
          description: "Signed in to your aMaze workspace.",
        });
      }

      navigate(redirectTo);
    } catch (err: any) {
      sessionStorage.removeItem(POST_SIGN_IN_DESTINATION_KEY);
      toast.error(
        mode === "signUp"
          ? "Could not create account. Please verify your details."
          : "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrcidAuth = async (customId?: string) => {
    const finalOrcid = customId || orcidInputId || "0000-0002-1825-0097";
    rememberDestination();
    setSubmitting(true);
    try {
      await signIn("orcid", {
        orcidId: finalOrcid,
        name: name.trim() || "Dr. Alex Morgan",
        email: email.trim() || "a.morgan@cam.ac.uk",
        institution: institution.trim() || "Cambridge Neurobiology Lab",
      });
      setIsOrcidAuthOpen(false);
      toast.success("ORCID iD verified! Redirecting to dashboard...");
      navigate(redirectTo);
    } catch {
      toast.error("Could not authenticate with ORCID.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = () => {
    if (!acceptedTerms && mode === "signUp") {
      toast.error("Please accept the Terms of Service.");
      return;
    }
    rememberDestination();
    window.location.href = `/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f9f8] text-[#142d31] dark:bg-[#071318] dark:text-[#e5f1f0] flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#c9d9d7] bg-white/80 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#071318]/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md border border-[#08796f]/30 bg-[#08796f]/[0.07] text-[#08796f] dark:border-[#68dfce]/30 dark:bg-[#48cdbb]/10 dark:text-[#59dbc7]">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]">
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

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Centered Auth Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-2xl border border-[#c4d6d4] bg-white p-6 shadow-xl sm:p-8 dark:border-white/10 dark:bg-[#09161a]">
          {/* Header */}
          <div className="space-y-1.5 pb-4">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#08796f] dark:text-[#52d8c4]">
              <ShieldCheck className="size-3.5" />
              Academic &amp; Researcher Access
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#142f32] dark:text-white">
              {mode === "signUp"
                ? "Create Your aMaze Account"
                : mode === "reset"
                  ? "Reset Your Password"
                  : "Sign In to aMaze"}
            </h1>
            <p className="text-xs text-[#526d6a] dark:text-[#8ea9a6]">
              {mode === "signUp"
                ? "Initialize your workspace, rodent tracking projects, and behavioral protocols."
                : mode === "reset"
                  ? "Enter your institutional email to receive a password reset link."
                  : "Access your rodent behavior experiments, arena zones, and telemetry analytics."}
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          {mode !== "reset" && (
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#cde0dd] bg-[#f2f7f6] p-1 dark:border-white/10 dark:bg-white/[0.04] mb-5">
              <button
                type="button"
                onClick={() => setMode("signIn")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                  mode === "signIn"
                    ? "bg-white text-[#132c30] shadow-xs dark:bg-[#0c1f25] dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserRound className="size-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signUp")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                  mode === "signUp"
                    ? "bg-white text-[#08796f] shadow-xs dark:bg-[#0c1f25] dark:text-[#52d8c4]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="size-3.5" />
                Create Account
              </button>
            </div>
          )}

          {/* Social Auth Buttons */}
          {mode !== "reset" && (
            <div className="space-y-2.5">
              {/* ORCID Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOrcidAuthOpen(true)}
                disabled={submitting}
                className="group relative flex h-10 w-full items-center justify-center gap-2.5 border-[#b3d465] bg-[#A6CE39]/10 font-medium text-[#2d4905] transition-all hover:border-[#85ab22] hover:bg-[#A6CE39]/20 dark:border-[#A6CE39]/40 dark:bg-[#A6CE39]/15 dark:text-[#d7f191] dark:hover:bg-[#A6CE39]/25"
              >
                <OrcidIcon className="size-4.5 transition-transform group-hover:scale-110" />
                <span className="text-xs font-semibold">
                  {mode === "signUp" ? "Create account with ORCID" : "Sign in with ORCID"}
                </span>
                <span className="ml-auto rounded-full bg-[#A6CE39]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#355708] dark:bg-[#A6CE39]/30 dark:text-[#dff5a1]">
                  ORCID iD
                </span>
              </Button>

              {/* Google Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={submitting}
                className="flex h-10 w-full items-center justify-center gap-2.5 border-zinc-200 bg-white font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.08]"
              >
                <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="text-xs font-semibold">
                  {mode === "signUp" ? "Sign up with Google" : "Sign in with Google"}
                </span>
              </Button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#cde0dd] dark:border-white/10" />
                </div>
                <span className="relative bg-white px-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground dark:bg-[#09161a]">
                  or continue with email
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "signUp" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="login-name" className="text-xs font-semibold">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="login-name"
                      placeholder="Dr. Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="login-inst" className="text-xs font-semibold">
                    Institution / University
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="login-inst"
                      placeholder="University of Cambridge"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="login-orcid" className="text-xs font-semibold">
                    ORCID iD (optional)
                  </Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="login-orcid"
                      placeholder="0000-0002-1825-0097"
                      value={orcid}
                      onChange={(e) => setOrcid(e.target.value)}
                      className="pl-9 font-mono text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor="login-email" className="text-xs font-semibold">
                Email Address <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="a.morgan@cam.ac.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs"
                  required
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-pass" className="text-xs font-semibold">
                    Password <span className="text-rose-500">*</span>
                  </Label>
                  {mode === "signIn" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-[11px] text-[#08796f] hover:underline dark:text-[#52d8c4]"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="login-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>
            )}

            {mode === "signUp" && (
              <div className="space-y-1">
                <Label htmlFor="login-confirm-pass" className="text-xs font-semibold">
                  Confirm Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="login-confirm-pass"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>
            )}

            {mode === "signUp" && (
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="login-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(c) => setAcceptedTerms(!!c)}
                  className="mt-0.5 size-3.5"
                />
                <label htmlFor="login-terms" className="text-[11px] text-muted-foreground leading-tight cursor-pointer">
                  I agree to the{" "}
                  <Link to="/terms" className="text-[#08796f] underline dark:text-[#52d8c4]">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-[#08796f] underline dark:text-[#52d8c4]">
                    Privacy Statement
                  </Link>
                  .
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full gap-2 bg-[#08796f] text-xs font-semibold text-white hover:bg-[#066a61] dark:bg-[#52d8c4] dark:text-[#041614] dark:hover:bg-[#43c4b1]"
            >
              {submitting ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {mode === "signUp"
                    ? "Complete Registration"
                    : mode === "reset"
                      ? "Send Reset Link"
                      : "Sign In"}
                </span>
              )}
            </Button>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="mt-4 pt-3 border-t border-[#cde0dd]/60 dark:border-white/10 text-center">
            <button
              type="button"
              onClick={() => {
                setName("Dr. Alex Morgan");
                setEmail("a.morgan@cam.ac.uk");
                setInstitution("University of Cambridge");
                setOrcid("0000-0002-1825-0097");
                setPassword("Neurobiology2026!");
                setConfirmPassword("Neurobiology2026!");
                toast.info("Demo researcher credentials filled.");
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Fill demo credentials (Dr. Alex Morgan)
            </button>
          </div>
        </div>
      </main>

      {/* ORCID Simulation Modal */}
      <Dialog open={isOrcidAuthOpen} onOpenChange={setIsOrcidAuthOpen}>
        <DialogContent className="max-w-md border border-[#c4d6d4] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#09161a]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#A6CE39]">
              <OrcidIcon className="size-4" />
              <span>ORCID Authentication</span>
            </div>
            <DialogTitle className="text-lg font-bold">Authorize aMaze with your ORCID iD</DialogTitle>
            <DialogDescription className="text-xs">
              Link your peer-reviewed publications and datasets directly with aMaze.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="login-orcid-input" className="text-xs font-semibold">
                Your 16-Digit ORCID iD
              </Label>
              <Input
                id="login-orcid-input"
                value={orcidInputId}
                onChange={(e) => setOrcidInputId(e.target.value)}
                placeholder="0000-0002-1825-0097"
                className="font-mono text-xs"
              />
            </div>

            <Button
              onClick={() => handleOrcidAuth()}
              disabled={submitting}
              className="w-full bg-[#A6CE39] font-bold text-zinc-950 hover:bg-[#95ba33]"
            >
              Confirm &amp; Link ORCID
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
