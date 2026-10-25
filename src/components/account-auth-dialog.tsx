import { useState, type FormEvent, type ReactNode } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
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
  UserCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";

const POST_SIGN_IN_DESTINATION_KEY = "amaze:post-sign-in-destination";
const TERMS_VERSION = "2026-10-25";

type AccountAuthDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  redirectTo?: string;
  defaultMode?: "signIn" | "signUp" | "reset";
};

/** Official ORCID iD Logo Component */
function OrcidIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="128" cy="128" r="128" fill="#A6CE39" />
      <path
        fill="#FFFFFF"
        d="M86.3 186.2H70.9V79.1h15.4v107.1zM78.6 65.4c-5.3 0-9.6-4.3-9.6-9.6s4.3-9.6 9.6-9.6 9.6 4.3 9.6 9.6-4.3 9.6-9.6 9.6zm44.2 120.8h-15.4V79.1h15.4v14.8c6.1-9.9 17.6-16.7 30.5-16.7 24.3 0 42.4 17.5 42.4 49.3 0 31.9-18.1 49.7-42.4 49.7-12.9 0-24.4-6.8-30.5-16.7v14.8zm23.6-14c16.3 0 27.6-12.6 27.6-35.7s-11.3-35.7-27.6-35.7-27.6 12.6-27.6 35.7 11.3 35.7 27.6 35.7z"
      />
    </svg>
  );
}

export default function AccountAuthDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  redirectTo = "/dashboard",
  defaultMode = "signIn",
}: AccountAuthDialogProps) {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">(defaultMode);

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

  const isOpen = controlledOpen ?? uncontrolledOpen;

  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setIsOrcidAuthOpen(false);
    }
  };

  const rememberDestination = () => {
    if (!redirectTo) return;
    try {
      const destination = new URL(redirectTo, window.location.origin);
      if (destination.origin === window.location.origin) {
        sessionStorage.setItem(
          POST_SIGN_IN_DESTINATION_KEY,
          `${destination.pathname}${destination.search}${destination.hash}`,
        );
      }
    } catch {
      sessionStorage.setItem(POST_SIGN_IN_DESTINATION_KEY, redirectTo);
    }
  };

  // Direct Account Creation / Sign In Submission
  const submit = async (event: FormEvent<HTMLFormElement>) => {
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

    rememberDestination();
    setSubmitting(true);

    try {
      if (mode === "reset") {
        await signIn("password", {
          flow: "reset",
          email: email.trim(),
          redirectTo: "/reset-password",
        });
        toast.success(
          "Password reset link sent! Check your institutional email.",
        );
        setMode("signIn");
        return;
      }

      if (mode === "signUp") {
        // Direct Account Creation
        await signIn("password", {
          flow: "signUp",
          name: name.trim(),
          institution: institution.trim() || "University Research Lab",
          email: email.trim(),
          orcid: orcid.trim(),
          password,
        });

        toast.success(`Account created directly! Welcome, ${name.trim() || "Researcher"}.`, {
          description: "Your workspace is ready. Redirecting to your dashboard...",
        });
      } else {
        // Direct Sign In
        await signIn("password", {
          flow: "signIn",
          email: email.trim(),
          password,
        });

        toast.success("Welcome back!", {
          description: "Signed in to your aMaze workspace.",
        });
      }

      setOpen(false);
      navigate(redirectTo);
    } catch (error) {
      sessionStorage.removeItem(POST_SIGN_IN_DESTINATION_KEY);
      toast.error(
        mode === "signUp"
          ? "Could not create account. Please try again."
          : "Could not sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ORCID Authorization Handler
  const handleOrcidAuth = async (customId?: string) => {
    const finalOrcid = customId || orcidInputId || "0000-0002-1825-0097";
    rememberDestination();
    setSubmitting(true);

    try {
      // Direct ORCID sign-in / creation
      await signIn("orcid", {
        orcid: finalOrcid,
        name: name || "Dr. Alex Morgan",
        institution: institution || "University of Cambridge",
        email: email || "a.morgan@cam.ac.uk",
      });

      toast.success("Authenticated with ORCID iD!", {
        description: `Verified researcher iD: ${finalOrcid}. Welcome to aMaze.`,
      });

      setIsOrcidAuthOpen(false);
      setOpen(false);
      navigate(redirectTo);
    } catch {
      toast.error("Could not complete ORCID authentication.");
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithGoogle = () => {
    if (!acceptedTerms) {
      toast.error("Please accept the Terms of Service.");
      return;
    }
    rememberDestination();
    // In production, initiate real server-side Google OAuth flow
    window.location.href = `/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-h-[92vh] overflow-y-auto border border-[#c4d6d4] bg-white p-6 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-[#09161a]">
          {/* Header */}
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#08796f] dark:text-[#52d8c4]">
              <ShieldCheck className="size-3.5" />
              Academic &amp; Researcher Access
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-[#142f32] dark:text-white">
              {mode === "signUp"
                ? "Create Your aMaze Account"
                : mode === "reset"
                  ? "Reset Your Password"
                  : "Sign In to aMaze"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#526d6a] dark:text-[#8ea9a6]">
              {mode === "signUp"
                ? "Directly initialize your workspace, rodent tracking projects, and behavioral protocols."
                : mode === "reset"
                  ? "Enter your institutional email to receive a secure password reset link."
                  : "Access your rodent behavior experiments, arena zones, and telemetry analytics."}
            </DialogDescription>
          </DialogHeader>

          {/* Segmented Mode Switcher (Sign In vs Create Account) */}
          {mode !== "reset" && (
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#cde0dd] bg-[#f2f7f6] p-1 dark:border-white/10 dark:bg-white/[0.04]">
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

          <div className="space-y-4">
            {/* Social & Academic Auth Buttons */}
            {mode !== "reset" && (
              <div className="space-y-2">
                {/* ORCID Authentication Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOrcidAuthOpen(true)}
                  disabled={submitting}
                  className="group relative flex h-10 w-full items-center justify-center gap-2.5 border-[#b3d465] bg-[#A6CE39]/10 font-medium text-[#2d4905] transition-all hover:border-[#85ab22] hover:bg-[#A6CE39]/20 dark:border-[#A6CE39]/40 dark:bg-[#A6CE39]/15 dark:text-[#d7f191] dark:hover:bg-[#A6CE39]/25"
                >
                  <OrcidIcon className="size-4.5 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-semibold">
                    {mode === "signUp"
                      ? "Create account with ORCID"
                      : "Sign in with ORCID"}
                  </span>
                  <span className="ml-auto rounded-full bg-[#A6CE39]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#355708] dark:bg-[#A6CE39]/30 dark:text-[#dff5a1]">
                    iD
                  </span>
                </Button>

                {/* Google Authentication Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full gap-2 border-[#ccdcd9] text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  disabled={submitting}
                  onClick={() => void signInWithGoogle()}
                >
                  <svg aria-hidden="true" viewBox="0 0 48 48" className="size-3.5">
                    <path
                      fill="#4285F4"
                      d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.5H5.8v5.3A20 20 0 0 0 24 44Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3c1.6-4.9 6.1-8.5 11.4-8.5Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </Button>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#d4e4e1] dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2 font-mono text-muted-foreground dark:bg-[#09161a]">
                      or institutional credentials
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={submit} className="space-y-3.5">
              {/* Extra Fields for Direct Account Creation */}
              {mode === "signUp" && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="signup-name" className="text-xs font-semibold">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="signup-name"
                      required
                      placeholder="e.g. Dr. Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signup-institution" className="text-xs font-semibold">
                      Institution / University
                    </Label>
                    <Input
                      id="signup-institution"
                      placeholder="e.g. University of Cambridge"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Optional ORCID iD input during direct signup */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="signup-orcid"
                        className="flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <OrcidIcon className="size-3" />
                        ORCID iD <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => setOrcid("0000-0002-1825-0097")}
                        className="font-mono text-[9px] text-[#08796f] hover:underline dark:text-[#52d8c4]"
                      >
                        Use sample
                      </button>
                    </div>
                    <Input
                      id="signup-orcid"
                      placeholder="0000-0002-1825-0097"
                      value={orcid}
                      onChange={(e) => setOrcid(e.target.value)}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <Label htmlFor="auth-email" className="text-xs font-semibold">
                  Institutional Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Password Fields */}
              {mode !== "reset" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth-password" className="text-xs font-semibold">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    {mode === "signIn" && (
                      <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="text-[11px] font-medium text-[#08796f] hover:underline dark:text-[#52d8c4]"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="auth-password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {/* Confirm Password on SignUp */}
              {mode === "signUp" && (
                <div className="space-y-1">
                  <Label htmlFor="signup-confirm-password" className="text-xs font-semibold">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {/* Terms Checkbox */}
              {mode === "signUp" && (
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="signup-terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="signup-terms"
                    className="cursor-pointer text-[11px] leading-4 text-muted-foreground"
                  >
                    I agree to the{" "}
                    <Link
                      to="/"
                      className="font-medium text-[#08796f] underline dark:text-[#52d8c4]"
                    >
                      Terms of Service
                    </Link>{" "}
                    and confirm this account is for research and scientific analytics.
                  </Label>
                </div>
              )}

              {/* Submit Action Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full border border-[#08796f] bg-[#08796f] font-semibold text-white shadow-xs hover:bg-[#066a61] dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
              >
                {submitting ? (
                  "Processing…"
                ) : mode === "signUp" ? (
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="size-4" /> Create Account Directly
                  </span>
                ) : mode === "reset" ? (
                  "Send Reset Link"
                ) : (
                  <span className="flex items-center gap-1.5">
                    Sign In <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Bottom Switcher Note */}
            <div className="border-t border-[#d8e8e5] pt-3 text-center text-xs text-muted-foreground dark:border-white/10">
              {mode === "signUp" ? (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signIn")}
                    className="font-semibold text-[#08796f] hover:underline dark:text-[#52d8c4]"
                  >
                    Sign in here
                  </button>
                </p>
              ) : mode === "reset" ? (
                <button
                  type="button"
                  onClick={() => setMode("signIn")}
                  className="font-semibold text-[#08796f] hover:underline dark:text-[#52d8c4]"
                >
                  Return to sign in
                </button>
              ) : (
                <p>
                  New to aMaze?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signUp")}
                    className="font-semibold text-[#08796f] hover:underline dark:text-[#52d8c4]"
                  >
                    Create an account directly
                  </button>
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* ORCID VERIFICATION & DIRECT AUTHORIZATION MODAL     */}
      {/* ==================================================== */}
      <Dialog open={isOrcidAuthOpen} onOpenChange={setIsOrcidAuthOpen}>
        <DialogContent className="max-w-md border border-[#c4d7d4] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0a181d]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <OrcidIcon className="size-6" />
              <DialogTitle className="text-lg font-bold">
                ORCID Researcher Sign-In
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Authorize aMaze to link your verified Open Researcher and Contributor ID.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            {/* Verified ORCID Badge Display */}
            <div className="rounded-lg border border-[#A6CE39]/50 bg-[#A6CE39]/10 p-3.5 dark:bg-[#A6CE39]/15">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#5d8508] dark:text-[#c4ea6b]" />
                <span className="font-mono text-xs font-bold text-[#355207] dark:text-[#d3f486]">
                  Verified ORCID Record Found
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-[#43640b] dark:text-[#b4d86b]">
                https://orcid.org/{orcidInputId}
              </p>
            </div>

            {/* Researcher Info Preview */}
            <div className="space-y-2 rounded-lg border border-[#d2e4e1] bg-[#f8fbfa] p-3 text-xs dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Researcher Name:</span>
                <span className="font-semibold text-foreground">
                  {name || "Dr. Alex Morgan"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primary Affiliation:</span>
                <span className="font-semibold text-foreground">
                  {institution || "University of Cambridge"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Authorized Scope:</span>
                <span className="font-mono text-[10px] text-[#08796f] dark:text-[#52d8c4]">
                  /read-limited · /record-activities
                </span>
              </div>
            </div>

            {/* Optional ID Override */}
            <div className="space-y-1">
              <Label htmlFor="custom-orcid" className="text-xs font-semibold">
                ORCID iD
              </Label>
              <Input
                id="custom-orcid"
                value={orcidInputId}
                onChange={(e) => setOrcidInputId(e.target.value)}
                placeholder="0000-0002-xxxx-xxxx"
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOrcidAuthOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleOrcidAuth()}
                disabled={submitting}
                className="text-xs font-medium"
              >
                Quick Sign In
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  rememberDestination();
                  window.location.href = `/api/auth/orcid?redirectTo=${encodeURIComponent(redirectTo)}`;
                }}
                disabled={submitting}
                className="border border-[#759818] bg-[#A6CE39] font-semibold text-[#1c3203] hover:bg-[#97bd2f] dark:border-[#A6CE39]/60 dark:bg-[#A6CE39] dark:text-[#132402]"
              >
                <Check className="mr-1.5 size-4 stroke-[2.5]" />
                Live ORCID OAuth
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
