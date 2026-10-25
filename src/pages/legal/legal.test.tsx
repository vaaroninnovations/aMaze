import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import PrivacyPolicyPage from "./privacy.tsx";
import DisclaimerPage from "./disclaimer.tsx";
import TermsOfServicePage from "./terms.tsx";
import ContactPage from "../contact/page.tsx";
import SiteFooter from "@/components/site-footer.tsx";

describe("Legal & Compliance Pages (SSR/Snapshot)", () => {
  it("renders the Privacy Statement with copyright and researcher data ownership", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/privacy"]}>
        <PrivacyPolicyPage />
      </MemoryRouter>
    );

    expect(html).toContain("Privacy Statement");
    expect(html).toContain("@drvara.si");
    expect(html).toContain("Scope and Scientific Data Ownership");
    expect(html).toContain("GDPR and International Compliance");
  });

  it("renders the Scientific Disclaimer with Research Use Only notice", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/disclaimer"]}>
        <DisclaimerPage />
      </MemoryRouter>
    );

    expect(html).toContain("Scientific &amp; Legal Disclaimer");
    expect(html).toContain("Research Use Only (RUO)");
    expect(html).toContain("Non-Clinical &amp; Medical Non-Diagnostic Disclaimer");
    expect(html).toContain("@drvara.si");
  });

  it("renders the Terms of Service with copyright ownership by @drvara.si", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/terms"]}>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    expect(html).toContain("Terms of Service");
    expect(html).toContain("Platform Copyright: @drvara.si");
    expect(html).toContain("Your Research &amp; Experimental Data");
    expect(html).toContain("@drvara.si");
  });

  it("renders the Contact page with form inputs and direct contact info", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/contact"]}>
        <ContactPage />
      </MemoryRouter>
    );

    expect(html).toContain("Contact Us");
    expect(html).toContain("contact@drvara.si");
    expect(html).toContain("https://drvara.si");
    expect(html).toContain("@drvara.si");
    expect(html).toContain("Submit Message");
  });

  it("renders SiteFooter with copyright @drvara.si and required legal links", () => {
    const html = renderToString(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>
    );

    expect(html).toContain("@drvara.si");
    expect(html).toContain("Privacy Statement");
    expect(html).toContain("Disclaimer");
    expect(html).toContain("Terms of Service");
    expect(html).toContain("Contact");
    expect(html).toContain("https://drvara.si");
  });
});
