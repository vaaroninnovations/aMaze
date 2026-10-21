import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useNavigate, useParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import AppHeader from "@/components/app-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { errorMessage } from "@/lib/errors.ts";

export default function InvitationPage() {
  const { inviteToken = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const invitation = useQuery(api.experiments.sharing.getInvitation, {
    inviteToken,
  });
  const accept = useMutation(api.experiments.sharing.acceptInvitation);
  const attempted = useRef(false);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  const acceptInvitation = useCallback(async () => {
    setAccepting(true);
    setError("");
    try {
      const experimentId = await accept({ inviteToken });
      toast.success("Invitation accepted.");
      navigate(`/experiments/${experimentId}`, { replace: true });
    } catch (reason: unknown) {
      const message = errorMessage(reason, "Could not accept this invitation.");
      setError(message);
      toast.error(message);
    } finally {
      setAccepting(false);
    }
  }, [accept, inviteToken, navigate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      attempted.current = false;
      return;
    }
    if (!invitation || attempted.current) return;
    attempted.current = true;
    void acceptInvitation();
  }, [acceptInvitation, invitation, isAuthenticated, isLoading]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-xl space-y-5 p-4 py-12">
        {invitation === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : invitation === null ? (
          <div className="space-y-2 rounded-xl border p-6">
            <h1 className="text-xl font-semibold">Invitation unavailable</h1>
            <p className="text-sm text-muted-foreground">
              This invitation may have expired, been revoked, or already been
              accepted.
            </p>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border p-6">
            <MailCheck className="size-7 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">Project invitation</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You are invited to{" "}
                <strong className="text-foreground">
                  {invitation.projectName}
                </strong>{" "}
                as a {invitation.role}.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Accept using the Google account for {invitation.email}.
              </p>
            </div>
            {isAuthenticated ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {error || "Accepting invitation…"}
                </p>
                {error && (
                  <Button
                    variant="outline"
                    disabled={accepting}
                    onClick={() => void acceptInvitation()}
                  >
                    {accepting ? "Trying again…" : "Try again"}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                disabled={isLoading}
                onClick={() =>
                  void signIn("google", {
                    redirectTo: window.location.href,
                  }).catch(() => toast.error("Could not start Google sign-in."))
                }
              >
                Continue with Google
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
