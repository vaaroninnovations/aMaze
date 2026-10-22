import { useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AppHeader from "@/components/app-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

export default function ResetPasswordPage() {
  const { signIn } = useAuthActions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code) {
      toast.error("This password reset link is missing or invalid.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn("password", {
        flow: "reset-verification",
        email: email.trim(),
        code,
        newPassword: password,
      });
      toast.success("Your password has been changed.");
      navigate("/settings", { replace: true });
    } catch {
      toast.error(
        "Could not reset your password. Check the email, link expiry, and password requirements, then try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-md space-y-6 p-4 py-12">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
            Account security
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The reset link expires after one hour. Use at least 8 characters.
          </p>
        </div>
        {!code ? (
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              This reset link is missing its verification code. Request a new
              link from the sign-in dialog.
            </p>
            <Button type="button" variant="secondary" onClick={() => navigate("/")}>
              Return home
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="space-y-4 rounded-xl border bg-card p-5"
          >
            <div className="space-y-2">
              <Label htmlFor="reset-email">Account email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating password…" : "Update password"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground">
          Read our{" "}
          <Link
            to="/privacy-policy"
            className="text-primary underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
