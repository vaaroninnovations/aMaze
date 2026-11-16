import LegalLayout from "./legal-layout.tsx";
import { FileText, CheckCircle2, ShieldAlert, Sparkles, Server, Ban, HelpCircle } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Governing terms and operational conditions for using the aMaze behavioral tracking suite."
      badge="Agreement & Terms"
    >
      <div className="prose prose-zinc max-w-none dark:prose-invert">
        {/* Intro Banner */}
        <div className="mb-8 rounded-xl border border-[#2a5ed3]/25 bg-[#2a5ed3]/[0.04] p-5 dark:border-[#71b8ff]/20 dark:bg-[#71b8ff]/[0.04]">
          <div className="flex items-start gap-3">
            <Sparkles className="size-5 shrink-0 text-[#2a5ed3] dark:text-[#71b8ff] mt-0.5" />
            <div className="text-sm leading-relaxed text-[#223048] dark:text-[#d7e1f3]">
              Welcome to <strong>aMaze</strong>. By accessing our web application, running instances on local servers, or utilizing containerized VPS deployments, you agree to be bound by these Terms of Service provided by{" "}
              <a
                href="https://drvara.si"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2a5ed3] underline font-semibold dark:text-[#71b8ff]"
              >
                @drvara.si
              </a>
              .
            </div>
          </div>
        </div>

        {/* Section 1: Agreement */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <FileText className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            1. Acceptance and Purpose
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            These Terms govern your use of the aMaze rodent behavioral tracking system, including the web application interface, computer vision tracking routines, REST API backend, trial management databases, and export utilities.
          </p>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            If you are using aMaze on behalf of a university, hospital, research institute, or corporate entity, you represent and warrant that you possess the authority to bind that entity to these Terms.
          </p>
        </section>

        {/* Section 2: Intellectual Property */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <CheckCircle2 className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            2. Intellectual Property &amp; Copyright Ownership
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 mt-3">
            <div className="rounded-lg border border-[#cdd6e5] bg-[#f9fcfb] p-4 dark:border-white/[0.08] dark:bg-[#0a111d]/50">
              <h3 className="text-sm font-semibold text-[#223048] dark:text-[#e3ebf9]">
                Platform Copyright: @drvara.si
              </h3>
              <p className="text-xs text-[#596780] dark:text-[#92a1bb] mt-1 leading-normal">
                The software architecture, visual interface designs, branding, logos, and proprietary algorithmic workflows of aMaze are the exclusive intellectual property of <strong>@drvara.si</strong> and are protected by international copyright laws.
              </p>
            </div>
            <div className="rounded-lg border border-[#cdd6e5] bg-[#f9fcfb] p-4 dark:border-white/[0.08] dark:bg-[#0a111d]/50">
              <h3 className="text-sm font-semibold text-[#223048] dark:text-[#e3ebf9]">
                Your Research &amp; Experimental Data
              </h3>
              <p className="text-xs text-[#596780] dark:text-[#92a1bb] mt-1 leading-normal">
                <strong>You retain 100% ownership</strong> of all data generated using aMaze. This includes raw video files, subject IDs, tracking coordinates, trajectories, statistics, graphs, and exported PDF/Excel reports. We claim zero proprietary rights over your research findings.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Permitted Use */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <Server className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            3. Permitted Academic &amp; Commercial Uses
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            You are granted a non-exclusive, revocable license to use aMaze for:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-[#525e74] dark:text-[#96a2b7]">
            <li>Academic laboratory animal behavioral research and non-clinical pharmaceutical discovery.</li>
            <li>Classroom, neurobiology education, and student training workshops.</li>
            <li>Self-hosting on internal laboratory workstations, institutional servers, or VPS instances (e.g., Hostinger VPS).</li>
            <li>Publishing graphs, heatmaps, and metrics in scientific peer-reviewed journals with proper methodology attribution.</li>
          </ul>
        </section>

        {/* Section 4: Prohibited Uses */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <Ban className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            4. Prohibited Activities
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            You agree not to engage in any of the following unauthorized practices:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-[#525e74] dark:text-[#96a2b7]">
            <li>Using the tracking suite for unlawful biometric surveillance or non-approved human tracking applications.</li>
            <li>Attempting to bypass authentication security or compromise server endpoints through distributed denial-of-service (DDoS) or exploit injection.</li>
            <li>Reselling, sub-licensing, or white-labeling the aMaze codebase without express written consent from @drvara.si.</li>
          </ul>
        </section>

        {/* Section 5: Disclaimer & Liability */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <ShieldAlert className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            5. Disclaimer of Warranties &amp; Operational Liability
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            The software is delivered on an "AS IS" and "AS AVAILABLE" basis. While we strive for absolute mathematical precision in our tracking and reporting algorithms, <strong>@drvara.si</strong> does not warrant that the application will operate entirely uninterrupted, error-free, or compatible with every camera hardware configuration.
          </p>
        </section>

        {/* Section 6: Contact & Inquiries */}
        <section className="rounded-xl border border-[#cdd6e5] bg-[#f9fcfb] p-6 dark:border-white/[0.08] dark:bg-[#0a111d]/60">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#223048] dark:text-[#e3ebf9]">
            <HelpCircle className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            6. Inquiries and Terms Enforcement
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            For contractual discussions, institutional enterprise licenses, or custom tracking development, please contact:
          </p>
          <div className="mt-3 text-sm font-mono text-[#2a5ed3] dark:text-[#71b8ff] space-y-1">
            <div>Email: <a href="mailto:contact@drvara.si" className="underline">contact@drvara.si</a></div>
            <div>Web: <a href="https://drvara.si" target="_blank" rel="noopener noreferrer" className="underline">https://drvara.si</a></div>
            <div>Copyright: <strong>© {new Date().getFullYear()} @drvara.si. All rights reserved.</strong></div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
