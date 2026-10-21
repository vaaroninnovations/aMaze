import { useState, type FormEvent, type ReactNode } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { toast } from "sonner";
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

const POST_SIGN_IN_DESTINATION_KEY = "amaze:post-sign-in-destination";

type AccountAuthDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  redirectTo?: string;
};

export default function AccountAuthDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  redirectTo,
}: AccountAuthDialogProps) {
  const { isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;

  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const rememberDestination = () => {
    if (!redirectTo) return;
    const destination = new URL(redirectTo, window.location.origin);
    if (destination.origin === window.location.origin) {
      sessionStorage.setItem(
        POST_SIGN_IN_DESTINATION_KEY,
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "signUp" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    rememberDestination();
    setSubmitting(true);
    try {
      const params =
        mode === "signUp"
          ? {
              flow: "signUp",
              name: name.trim(),
              institution: institution.trim(),
              email: email.trim(),
              password,
              ...(redirectTo ? { redirectTo } : {}),
            }
          : {
              flow: "signIn",
              email: email.trim(),
              password,
              ...(redirectTo ? { redirectTo } : {}),
            };
      await signIn("password", params);
      setOpen(false);
    } catch (error) {
      sessionStorage.removeItem(POST_SIGN_IN_DESTINATION_KEY);
      toast.error(
        error instanceof Error
          ? error.message
          : mode === "signUp"
            ? "Could not create your account."
            : "Could not sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    rememberDestination();
    setSubmitting(true);
    try {
      await signIn("google", redirectTo ? { redirectTo } : undefined);
    } catch {
      sessionStorage.removeItem(POST_SIGN_IN_DESTINATION_KEY);
      toast.error("Could not start Google sign-in.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "signUp" ? "Create your aMaze account" : "Welcome back"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signUp"
              ? "Save your projects and manage your research workspace."
              : "Sign in to continue to your aMaze workspace."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting || isLoading}
            onClick={() => void signInWithGoogle()}
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4">
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
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or use email
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            {mode === "signUp" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Full name</Label>
                  <Input
                    id="account-name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-institution">
                    Institution{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="account-institution"
                    autoComplete="organization"
                    value={institution}
                    onChange={(event) => setInstitution(event.target.value)}
                    maxLength={160}
                    placeholder="University or research organization"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-password">Password</Label>
              <Input
                id="account-password"
                type="password"
                autoComplete={
                  mode === "signUp" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
              {mode === "signUp" && (
                <p className="text-xs text-muted-foreground">
                  Use at least 8 characters.
                </p>
              )}
            </div>
            {mode === "signUp" && (
              <div className="space-y-2">
                <Label htmlFor="account-confirm-password">
                  Confirm password
                </Label>
                <Input
                  id="account-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || isLoading}
            >
              {submitting
                ? "Please wait…"
                : mode === "signUp"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signUp" ? "Already have an account?" : "New to aMaze?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
            >
              {mode === "signUp" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
