import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const TrackPage = lazy(() => import("./pages/track/page.tsx"));
const ExperimentsPage = lazy(() => import("./pages/experiments/page.tsx"));
const ExperimentPage = lazy(
  () => import("./pages/experiments/detail/page.tsx"),
);
const TrialPage = lazy(() => import("./pages/experiments/trial/page.tsx"));

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Index />} />
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
