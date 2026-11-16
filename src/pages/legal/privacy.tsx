import LegalLayout from "./legal-layout.tsx";
import { ShieldCheck, Lock, Database, UserCheck, HardDrive, Cpu, Globe } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Statement"
      subtitle="Commitment to laboratory data sovereignty, researcher confidentiality, and privacy safeguards."
      badge="Data Protection & Privacy"
    >
      <div className="prose prose-zinc max-w-none dark:prose-invert">
        {/* Highlight Card */}
        <div className="mb-8 rounded-xl border border-[#2a5ed3]/25 bg-[#2a5ed3]/[0.04] p-5 dark:border-[#71b8ff]/20 dark:bg-[#71b8ff]/[0.04]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-5 shrink-0 text-[#2a5ed3] dark:text-[#71b8ff] mt-0.5" />
            <div className="text-sm leading-relaxed text-[#223048] dark:text-[#d7e1f3]">
              <strong>Core Privacy Principle:</strong> At <strong>aMaze</strong> (operated by{" "}
              <a
                href="https://drvara.si"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2a5ed3] underline font-semibold dark:text-[#71b8ff]"
              >
                @drvara.si
              </a>
              ), we hold that your research data, experimental methodologies, rodent video recordings, and behavioral metrics belong solely and unconditionally to you and your research institution. We do not sell, monetize, or harvest your scientific data.
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <Database className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            1. Scope and Scientific Data Ownership
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            This Privacy Statement applies to all versions of the <strong>aMaze</strong> automated tracking platform, whether accessed via our cloud instances, hosted on institutional servers, or deployed via Docker/VPS on your private infrastructure.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-[#525e74] dark:text-[#96a2b7]">
            <li>
              <strong>Video Files &amp; Recordings:</strong> Videos uploaded for computer vision tracking (MP4, WebM, MOV) are processed directly within the execution runtime. Videos are stored in your secure local instance or isolated VPS storage (<code>data/uploads/</code>) and are never exposed publicly.
            </li>
            <li>
              <strong>Tracking Coordinates &amp; Trajectories:</strong> Time-series centroid points, posture vectors, zone transition events, and speed calculations are stored in your project database and are never used to train global commercial models without explicit consent.
            </li>
            <li>
              <strong>Intellectual Property:</strong> All research protocols, animal cohort metadata, pharmacological test conditions, and exported figures remain 100% your institution’s intellectual property.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <UserCheck className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            2. Information We Collect and Process
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            We adhere to strict data minimization principles. The only data processed includes:
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <div className="rounded-lg border border-[#cdd6e5] bg-[#f9fcfb] p-4 dark:border-white/[0.08] dark:bg-[#0a111d]/50">
              <h3 className="text-sm font-semibold text-[#223048] dark:text-[#e3ebf9]">
                Authentication Credentials
              </h3>
              <p className="text-xs text-[#596780] dark:text-[#92a1bb] mt-1 leading-normal">
                When logging in via <strong>Google OAuth</strong> or <strong>ORCID OAuth</strong>, we store only your verified user ID, email address, display name, and avatar URL to maintain your authenticated session.
              </p>
            </div>
            <div className="rounded-lg border border-[#cdd6e5] bg-[#f9fcfb] p-4 dark:border-white/[0.08] dark:bg-[#0a111d]/50">
              <h3 className="text-sm font-semibold text-[#223048] dark:text-[#e3ebf9]">
                Session &amp; Calibration State
              </h3>
              <p className="text-xs text-[#596780] dark:text-[#92a1bb] mt-1 leading-normal">
                HMAC-SHA256 signed session tokens stored in secure, HTTP-only cookies; local browser storage used strictly for UI theme preferences and last active arena scale calibrations.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <Cpu className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            3. On-Device &amp; Private Server Processing
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            Behavioral analysis, adaptive background subtraction, and ellipse posture modeling execute either inside your browser client (HTML5 Canvas + WebAssembly) or on your private self-hosted Express instance. No streaming video frames are transmitted to foreign unauthenticated servers.
          </p>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <Lock className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            4. Security and Storage Architecture
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            We apply defense-in-depth measures to protect your experimental datasets:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-[#525e74] dark:text-[#96a2b7]">
            <li>Encrypted transport via TLS 1.3 for all web traffic and API endpoints.</li>
            <li>Atomic file locking for local JSON stores to prevent data corruption during simultaneous trial recordings.</li>
            <li>No third-party trackers, marketing cookies, or external ad scripts are embedded within the application.</li>
            <li>Isolated containerized execution through Docker and PM2 process sandboxing.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d293e] dark:text-[#e8eefa]">
            <Globe className="size-5 text-[#2a5ed3] dark:text-[#71b8ff]" />
            5. GDPR and International Compliance
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            In accordance with the EU General Data Protection Regulation (GDPR) and international research data governance frameworks:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-[#525e74] dark:text-[#96a2b7]">
            <li><strong>Right to Erasure:</strong> You can purge your projects, trials, and uploaded videos at any time with instantaneous physical removal from disk.</li>
            <li><strong>Right to Portability:</strong> Export all raw time-series data, metrics, and zone events in open formats (CSV, Excel, JSON).</li>
            <li><strong>Data Retention:</strong> Data remains stored only for as long as your self-hosted database or account remains active.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="rounded-xl border border-[#cdd6e5] bg-[#f9fcfb] p-6 dark:border-white/[0.08] dark:bg-[#0a111d]/60">
          <h2 className="text-lg font-semibold text-[#223048] dark:text-[#e3ebf9]">
            6. Privacy Inquiries &amp; Contact
          </h2>
          <p className="text-sm leading-relaxed text-[#525e74] dark:text-[#96a2b7] mt-2">
            For questions concerning this Privacy Statement, data rights, or institutional compliance agreements, please reach out to:
          </p>
          <div className="mt-3 text-sm font-mono text-[#2a5ed3] dark:text-[#71b8ff] space-y-1">
            <div>Email: <a href="mailto:privacy@drvara.si" className="underline">privacy@drvara.si</a> / <a href="mailto:contact@drvara.si" className="underline">contact@drvara.si</a></div>
            <div>Web: <a href="https://drvara.si" target="_blank" rel="noopener noreferrer" className="underline">https://drvara.si</a></div>
            <div>Organization: <strong>@drvara.si</strong></div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
