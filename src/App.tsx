import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { getAnonymousSessionId } from "@/lib/anonymous-session.ts";
import { DefaultProviders } from "./components/providers/default.tsx";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const TrackPage = lazy(() => import("./pages/track/page.tsx"));
const ExperimentsPage = lazy(() => import("./pages/experiments/page.tsx"));
const ExperimentPage = lazy(
  () => import("./pages/experiments/detail/page.tsx"),
);
const TrialPage = lazy(() => import("./pages/experiments/trial/page.tsx"));
const ProfilePage = lazy(() => import("./pages/profile/page.tsx"));
const ProjectsPage = lazy(() => import("./pages/projects/page.tsx"));
const SettingsPage = lazy(() => import("./pages/settings/page.tsx"));
const ResetPasswordPage = lazy(
  () => import("./pages/reset-password/page.tsx"),
);
const PrivacyPolicyPage = lazy(
  () => import("./pages/privacy-policy/page.tsx"),
);
const TermsOfServicePage = lazy(
  () => import("./pages/terms-of-service/page.tsx"),
);
const ContactPage = lazy(() => import("./pages/contact/page.tsx"));
const SharedProjectPage = lazy(() => import("./pages/share/page.tsx"));
const InvitationPage = lazy(() => import("./pages/invite/page.tsx"));

function SessionAccountSync() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const claimProjects = useMutation(api.users.claimAnonymousProjects);
  const synced = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      synced.current = false;
      return;
    }
    if (synced.current) return;
    synced.current = true;
    void claimProjects({ ownerKey: getAnonymousSessionId() })
      .then((count) => {
        if (count > 0) {
          toast.success(
            `${count} anonymous project${count === 1 ? "" : "s"} moved to your account.`,
          );
        }
      })
      .catch((error: unknown) => {
        synced.current = false;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not move your anonymous projects to your account.",
        );
      });
  }, [claimProjects, isAuthenticated, isLoading]);

  return null;
}

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <SessionAccountSync />
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/privacy-policy"
              element={<PrivacyPolicyPage />}
            />
            <Route
              path="/terms-of-service"
              element={<TermsOfServicePage />}
            />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/reset-password"
              element={<ResetPasswordPage />}
            />
            <Route path="/share/:shareToken" element={<SharedProjectPage />} />
            <Route path="/invite/:inviteToken" element={<InvitationPage />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/experiments" element={<ExperimentsPage />} />
            <Route
              path="/experiments/:experimentId"
              element={<ExperimentPage />}
            />
            <Route
              path="/experiments/:experimentId/trials/:trialId"
              element={<TrialPage />}
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DefaultProviders>
  );
}
