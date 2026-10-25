import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import Index from "./pages/Index.tsx";
import UserDashboard from "./pages/dashboard/page.tsx";
import ExperimentalSetupPage from "./pages/setup/page.tsx";
import TrackPage from "./pages/track/page.tsx";
import ExperimentalRunPage from "./pages/experiment/page.tsx";
import ProjectDetailsPage from "./pages/project/page.tsx";

/**
 * aMaze App
 * - Page 1: Home Landing Page (`/`)
 * - Page 2: User Dashboard (`/dashboard`, `/projects`)
 * - Page 3: Experimental Setup (`/setup`)
 * - Page 4: Experimental Run / Live Tracking (`/track`, `/experiment/run`)
 * - Page 5: Project Details & Results (`/project/:projectId`, `/projects/:projectId`)
 */
export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/projects" element={<UserDashboard />} />
          <Route path="/setup" element={<ExperimentalSetupPage />} />
          <Route path="/experiment/run" element={<TrackPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/experiment/standalone" element={<ExperimentalRunPage />} />
          <Route path="/project/:projectId" element={<ProjectDetailsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
          <Route path="/project" element={<ProjectDetailsPage />} />
          {/* Catch-all fallback */}
          <Route path="*" element={<Index />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
