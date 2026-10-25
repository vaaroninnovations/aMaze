# aMaze - UI Redesign & Improvisation Workspace

This workspace is dedicated to creating and improvising the pages for **aMaze** one by one before wiring them together.

## Current State: Step 1 (Home Page Alone)
- **Home Page**: [`src/pages/Index.tsx`](./src/pages/Index.tsx)
- **Status**: Self-contained, fully interactive, and unwired from external backend/Convex requirements.
- **Includes**:
  - Hero section with live telemetry metrics
  - Open-field arena tracking preview card & hero image
  - Interactive rat canvas animation background (`RodentBackground`)
  - Methodology templates list (Open Field, Barnes Maze, Elevated Plus, etc.)
  - Features grid
  - Responsive header & site footer with theme toggle (dark/light mode)

## How to Run Locally

Open a terminal inside this folder and run:

```bash
npm run dev
```

Then visit [http://localhost:5173](http://localhost:5173).

## Next Steps
- Improvise the Home page design and features as desired.
- Build the next page (Step 2) in `src/pages/<next-page>/`.
- Once all pages are ready, wire them together with state, routing, and backend services.
