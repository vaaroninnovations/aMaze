import LegalLayout from "./legal-layout.tsx";
import { AlertTriangle, Microscope, Stethoscope, Eye, HeartHandshake, Scale } from "lucide-react";

export default function DisclaimerPage() {
  return (
    <LegalLayout
      title="Scientific & Legal Disclaimer"
      subtitle="Important regulatory and technical notices regarding research scope, computer vision variance, and ethical compliance."
      badge="Legal & Research Notice"
    >
      <div className="prose prose-zinc max-w-none dark:prose-invert">
        {/* Prominent Caution Banner */}
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-5 dark:border-amber-400/25 dark:bg-amber-400/[0.05]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm leading-relaxed text-[#183538] dark:text-[#d3e5e3]">
              <strong>Notice:</strong> <strong>aMaze</strong> is engineered strictly for <strong>Research Use Only (RUO)</strong> in academic, institutional, and pharmaceutical laboratory settings. It is not approved, certified, or intended for medical diagnosis, clinical treatment, or healthcare applications in humans.
            </div>
          </div>
        </div>

        {/* Section 1: RUO */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#142d31] dark:text-[#e5f1f0]">
            <Microscope className="size-5 text-[#08796f] dark:text-[#59dbc7]" />
            1. Research Use Only (RUO) Specification
          </h2>
          <p className="text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] mt-2">
            The software suite, algorithms, and analytical figures provided by <strong>aMaze</strong> (developed by{" "}
            <a
              href="https://drvara.si"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#08796f] underline font-semibold dark:text-[#59dbc7]"
            >
              @drvara.si
            </a>
            ) are designed specifically for pre-clinical neuroscience, ethology, behavioral phenotyping, and pharmacological testing in laboratory animal models (e.g., mice and rats).
          </p>
          <p className="text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] mt-2">
            The outputs—including distance traveled, velocity profiles, zone entries, latency to escape, and occupancy heatmaps—are quantitative research indicators intended to aid scientific discovery and must be interpreted by qualified investigators.
          </p>
        </section>

        {/* Section 2: Non-Clinical */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#142d31] dark:text-[#e5f1f0]">
            <Stethoscope className="size-5 text-[#08796f] dark:text-[#59dbc7]" />
            2. Non-Clinical &amp; Medical Non-Diagnostic Disclaimer
          </h2>
          <p className="text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] mt-2">
            aMaze has not been cleared, cleared as 510(k), CE-marked under IVDR/MDR, or approved by the U.S. Food and Drug Administration (FDA), European Medicines Agency (EMA), or any equivalent health authority.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-[#4b6362] dark:text-[#91a7a4]">
            <li>Under no circumstances should data from aMaze be used directly or indirectly for clinical diagnostics in human patients.</li>
            <li>No therapeutic, surgical, or clinical dosage decisions should be based solely on automated software measures without independent confirmatory scientific protocols.</li>
          </ul>
        </section>

        {/* Section 3: Vision Variance */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#142d31] dark:text-[#e5f1f0]">
            <Eye className="size-5 text-[#08796f] dark:text-[#59dbc7]" />
            3. Computer Vision &amp; Tracking Variance
          </h2>
          <p className="text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] mt-2">
            Automated tracking algorithms (adaptive background modeling, thresholding, contour extraction, posture ellipse fitting) operate on visual features from digital video streams.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mt-3">
            <div className="rounded-lg border border-[#c9d9d7] bg-[#f9fcfb] p-4 dark:border-white/[0.08] dark:bg-[#071318]/50">
              <h3 className="text-sm font-semibold text-[#183538] dark:text-[#e0eeec]">
                Environmental Influences
              </h3>
              <p className="text-xs text-[#526d6b] dark:text-[#8ba7a5] mt-1 leading-normal">
                Lighting flicker, shadows, reflections on maze walls, bedding disturbances, low contrast (e.g. black mice on dark bedding), camera barrel distortion, and visual occlusions can affect tracking precision and centroid stability.
              </p>
            </div>
            <div className="rounded-lg border border-[#c9d9d7] bg-[#f9fcfb] p-4 dark:border-white/[0.08] dark:bg-[#071318]/50">
              <h3 className="text-sm font-semibold text-[#183538] dark:text-[#e0eeec]">
                Researcher Verification
              </h3>
              <p className="text-xs text-[#526d6b] dark:text-[#8ba7a5] mt-1 leading-normal">
                Investigators must calibrate metric scales (pixels to centimeters) accurately against physical arena markers and visually inspect tracking overlays to ensure data integrity prior to peer-reviewed publication.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Animal Welfare */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#142d31] dark:text-[#e5f1f0]">
            <HeartHandshake className="size-5 text-[#08796f] dark:text-[#59dbc7]" />
            4. Ethical Animal Welfare &amp; Institutional Oversight
          </h2>
          <p className="text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] mt-2">
            The authors and maintainers at <strong>@drvara.si</strong> strongly endorse the ethical and humane treatment of laboratory animals.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-[#4b6362] dark:text-[#91a7a4]">
            <li>
              Users must ensure all behavioral paradigms comply with institutional guidelines, including Institutional Animal Care and Use Committee (<strong>IACUC</strong>) approvals, the <strong>ARRIVE 2.0</strong> guidelines, and <strong>Directive 2010/63/EU</strong> on the protection of animals used for scientific purposes.
            </li>
            <li>
              aMaze provides video recording and post-hoc/live analysis only. The physical management, humane handling, habituation, and endpoint criteria of laboratory animals remain the sole responsibility of the investigator.
            </li>
          </ul>
        </section>

        {/* Section 5: Limitation of Liability */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#142d31] dark:text-[#e5f1f0]">
            <Scale className="size-5 text-[#08796f] dark:text-[#59dbc7]" />
            5. Limitation of Liability &amp; "As Is" Provision
          </h2>
          <p className="text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] mt-2">
            aMaze is provided <em>"as is"</em> and <em>"as available"</em>, without warranties of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular academic purpose, or non-infringement.
          </p>
          <p className="text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] mt-2">
            In no event shall <strong>@drvara.si</strong>, its contributors, or affiliates be liable for any direct, indirect, incidental, special, exemplary, or consequential damages (including, but not limited to, loss of scientific data, research grant disruption, publication retractions, or computer hardware downtime) arising in any way out of the use of this software.
          </p>
        </section>

        {/* Section 6: Contact */}
        <section className="rounded-xl border border-[#c9d9d7] bg-[#f9fcfb] p-6 dark:border-white/[0.08] dark:bg-[#071318]/60">
          <h2 className="text-lg font-semibold text-[#183538] dark:text-[#e0eeec]">
            Questions Regarding Compliance &amp; Disclaimers
          </h2>
          <p className="text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] mt-2">
            For clarifications on research usage licenses, software validation documents, or institutional oversight inquiries, contact:
          </p>
          <div className="mt-3 text-sm font-mono text-[#08796f] dark:text-[#59dbc7] space-y-1">
            <div>Email: <a href="mailto:contact@drvara.si" className="underline">contact@drvara.si</a></div>
            <div>Website: <a href="https://drvara.si" target="_blank" rel="noopener noreferrer" className="underline">https://drvara.si</a></div>
            <div>Organization: <strong>@drvara.si</strong></div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
