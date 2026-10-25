import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProjectDetailsPage from "./page.tsx";

describe("ProjectDetailsPage", () => {
  it("renders without crashing", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/project/proj-1"]}>
        <Routes>
          <Route path="/project/:projectId" element={<ProjectDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(html).toContain("Project");
    expect(html).toContain("Locomotor Velocity Timeline");
    expect(html).toContain("speedPlotClip");
  });

  it("safely contains velocity chart with clipPath and dynamic scale", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/project/proj-1"]}>
        <Routes>
          <Route path="/project/:projectId" element={<ProjectDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(html).toContain("overflow-hidden");
    expect(html).toContain("speedPlotClip");
  });
});
