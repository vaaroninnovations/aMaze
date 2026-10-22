import { Link } from "react-router-dom";
import AppHeader from "@/components/app-header.tsx";
import SiteFooter from "@/components/site-footer.tsx";

const sectionClass = "space-y-3";
const paragraphClass = "leading-7 text-muted-foreground";
const listClass = "list-disc space-y-1 pl-6 leading-7 text-muted-foreground";
const orderedClass =
  "list-decimal space-y-1 pl-6 leading-7 text-muted-foreground";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="space-y-10">
          <header className="space-y-4 border-b pb-7">
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
              Legal
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Terms of Service
            </h1>
            <p className="text-base font-medium text-muted-foreground">
              aMaze — Advanced Maze-Based Animal Behaviour Tracking and Analysis
            </p>
            <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="inline font-medium text-foreground">Effective date: </dt>
                <dd className="inline">22 October 2026</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Website: </dt>
                <dd className="inline">
                  <a
                    href="https://amaze.drvara.si/"
                    className="text-primary underline underline-offset-4"
                  >
                    https://amaze.drvara.si
                  </a>
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Operated by: </dt>
                <dd className="inline">[Legal name of operator or organization]</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Contact: </dt>
                <dd className="inline">[Official support email]</dd>
              </div>
            </dl>
          </header>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">1. Introduction and Acceptance of Terms</h2>
            <p className={paragraphClass}>
              Welcome to <strong className="text-foreground">aMaze</strong>, an online scientific research application designed for tracking, measuring, analysing, and visualising laboratory animal behaviour using experimental maze-based methodologies.
            </p>
            <p className={paragraphClass}>
              These Terms of Service (&quot;Terms&quot;) govern access to and use of the aMaze website, application, associated software, computational services, and analytical tools (collectively, the &quot;Service&quot;).
            </p>
            <p className={paragraphClass}>
              By creating an account, accessing, or using the Service, users agree to comply with these Terms and the associated Privacy Policy.
            </p>
            <p className={paragraphClass}>Users who do not agree with these Terms should discontinue use of the Service.</p>
            <p className={paragraphClass}>
              If a user accesses aMaze on behalf of an academic institution, research organisation, laboratory, or other entity, they represent that they have appropriate authorisation to use the Service on that entity&apos;s behalf.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">2. Description of Services</h2>
            <p className={paragraphClass}>aMaze provides digital tools supporting experimental animal behavioural research, including:</p>
            <ul className={listClass}>
              <li>Video-based tracking of laboratory rodent movements.</li>
              <li>Analysis of behaviour in experimental maze environments.</li>
              <li>Tracking of animal positions, locomotor activity, and movement trajectories.</li>
              <li>Generation of behavioural parameters and experimental measurements.</li>
              <li>Visualisation of movement paths and experimental outputs.</li>
              <li>Creation, management, retrieval, and deletion of research projects.</li>
              <li>Export and download of available analytical results.</li>
              <li>Management of user profiles, preferences, and account settings.</li>
            </ul>
            <p className={paragraphClass}>
              Certain features may depend on browser compatibility, server resources, file formats, and experimental configurations.
            </p>
            <p className={paragraphClass}>
              aMaze may introduce, modify, improve, restrict, or discontinue functionality as part of its ongoing development.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">3. User Eligibility and Account Registration</h2>
            <p className={paragraphClass}>Users must be at least 18 years old or meet the applicable legal age required to enter into these Terms.</p>
            <p className={paragraphClass}>Users agree to provide accurate account information and maintain the security of their authentication credentials.</p>
            <p className={paragraphClass}>Account creation and authentication may be supported through third-party authentication providers, including Google.</p>
            <p className={paragraphClass}>Each user is responsible for activities performed through their account unless resulting from circumstances for which aMaze is legally responsible.</p>
            <p className={paragraphClass}>Users must not share authentication credentials, impersonate another person, or attempt unauthorised access to accounts or system resources.</p>
            <p className={paragraphClass}>aMaze may restrict or suspend accounts when reasonably necessary to investigate security incidents, suspected misuse, or material violations of these Terms.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">4. Permitted Use</h2>
            <p className={paragraphClass}>aMaze is intended for legitimate educational, scientific, academic, laboratory, and research activities.</p>
            <p className={paragraphClass}>Users may utilise the Service for:</p>
            <ol className={orderedClass}>
              <li>Preclinical behavioural research.</li>
              <li>Laboratory rodent movement tracking.</li>
              <li>Experimental maze-based behavioural analysis.</li>
              <li>Academic demonstrations and training.</li>
              <li>Development of scientific reports, dissertations, manuscripts, and research publications.</li>
              <li>Evaluation and visualisation of experimental behavioural outcomes.</li>
            </ol>
            <p className={paragraphClass}>Commercial or institutional use is permitted only to the extent supported by the applicable service plan, licence, or separate written agreement, if any.</p>
            <p className={paragraphClass}>Users must comply with applicable laws, research protocols, ethical approvals, and institutional requirements.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">5. Research Ethics and Animal Welfare</h2>
            <p className={paragraphClass}>aMaze provides analytical software and does not conduct, supervise, approve, or independently validate animal experiments.</p>
            <p className={paragraphClass}>Users conducting animal studies are responsible for obtaining and maintaining all necessary institutional and regulatory approvals.</p>
            <p className={paragraphClass}>
              Depending on the jurisdiction, these may include approvals from Institutional Animal Ethics Committees (IAEC), requirements prescribed by India&apos;s Committee for Control and Supervision of Experiments on Animals (CCSEA), or equivalent competent authorities.
            </p>
            <p className={paragraphClass}>Users remain responsible for appropriate experimental design, humane animal handling, welfare monitoring, documentation, and compliance with applicable research standards.</p>
            <p className={paragraphClass}>Use of aMaze does not substitute for regulatory authorisation or ethical review.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">6. Scientific Accuracy and Research Responsibility</h2>
            <p className={paragraphClass}>aMaze generates computational outputs based on uploaded recordings, selected experimental parameters, tracking methods, and software processing.</p>
            <p className={paragraphClass}>Results may be affected by factors including:</p>
            <ul className={listClass}>
              <li>Video quality and resolution.</li>
              <li>Lighting and environmental conditions.</li>
              <li>Camera position and recording angle.</li>
              <li>Maze calibration and experimental configuration.</li>
              <li>Occlusion, reflections, and background interference.</li>
              <li>Tracking algorithm limitations.</li>
              <li>Incorrect user-defined parameters.</li>
              <li>Software processing errors.</li>
            </ul>
            <p className={paragraphClass}><strong className="text-foreground">aMaze does not guarantee that generated measurements are error-free, scientifically validated for every experimental model, or suitable for all research purposes.</strong></p>
            <p className={paragraphClass}>Users are responsible for verifying tracking accuracy, validating experimental measurements, reviewing outputs, and determining the suitability of the results for scientific interpretation.</p>
            <p className={paragraphClass}>The Service is a research-support tool and not a substitute for independent scientific judgement.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">7. Ownership of Research Data</h2>
            <p className={paragraphClass}>Users retain their existing ownership and intellectual property rights in the research information they upload or generate through aMaze.</p>
            <p className={paragraphClass}>This may include:</p>
            <ul className={listClass}>
              <li>Experimental videos.</li>
              <li>Behavioural tracking datasets.</li>
              <li>Movement trajectories.</li>
              <li>Experimental parameters.</li>
              <li>Analysis outputs.</li>
              <li>Graphs and figures.</li>
              <li>Project files.</li>
              <li>Generated reports.</li>
            </ul>
            <p className={paragraphClass}>Uploading research data does not transfer intellectual property ownership to aMaze.</p>
            <p className={paragraphClass}>Users grant the Service operator a limited, non-exclusive authorisation to host, store, reproduce, process, and display submitted material solely as necessary to provide the Service, maintain its functionality, and carry out processing permitted by the Privacy Policy and applicable law.</p>
            <p className={paragraphClass}>Users represent that they have the necessary permissions to upload and process their submitted material.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">8. Research Data Confidentiality</h2>
            <p className={paragraphClass}>aMaze recognises that uploaded experimental materials may include unpublished, proprietary, confidential, or institutionally restricted research information.</p>
            <p className={paragraphClass}>The Service will handle such information according to its published Privacy Policy and implemented security arrangements.</p>
            <p className={paragraphClass}>Research content will not be intentionally published or shared with unrelated third parties without appropriate authorisation, except where legally required or otherwise permitted under applicable law and the Privacy Policy.</p>
            <p className={paragraphClass}>Users should avoid uploading information that their institutional policies prohibit from being transferred to external services.</p>
            <p className={paragraphClass}>The Service is not a substitute for a formally approved institutional research-data repository unless the institution has independently assessed and authorised its use.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">9. Saved Projects and Data Management</h2>
            <p className={paragraphClass}>Authenticated users may be provided with project-management functionality, including creating, accessing, saving, downloading, and deleting projects.</p>
            <p className={paragraphClass}>Users are responsible for maintaining independent copies of important research information.</p>
            <p className={paragraphClass}>Project deletion may permanently remove associated data from active application storage.</p>
            <p className={paragraphClass}>Some information may remain temporarily in backups or technical records according to applicable retention requirements.</p>
            <p className={paragraphClass}><strong className="text-foreground">aMaze should not be treated as the sole archival location for irreplaceable experimental recordings or research datasets.</strong></p>
            <p className={paragraphClass}>The availability and duration of project storage may be subject to technical limitations, account status, or future service policies.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">10. Acceptable Use and Prohibited Activities</h2>
            <p className={paragraphClass}>Users must not:</p>
            <ol className={orderedClass}>
              <li>Access or attempt to access another user&apos;s account or private research information without authorisation.</li>
              <li>Upload malicious files, scripts, or other harmful materials.</li>
              <li>Attempt to compromise the security, availability, or integrity of the Service.</li>
              <li>Perform unauthorised penetration testing or exploit system vulnerabilities.</li>
              <li>Circumvent authentication, rate limits, access controls, or technical restrictions.</li>
              <li>Use automated requests in a manner that materially disrupts application performance.</li>
              <li>Upload content that infringes intellectual property rights or applicable law.</li>
              <li>Misrepresent, fabricate, or intentionally manipulate research results and attribute such actions to the Service.</li>
              <li>Redistribute, resell, or commercially exploit the application itself without appropriate authorisation.</li>
              <li>Reverse engineer or extract proprietary components except as permitted by applicable law or open-source licences.</li>
            </ol>
            <p className={paragraphClass}>Reasonable restrictions may be applied to protect the Service and other users.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">11. Intellectual Property Rights</h2>
            <p className={paragraphClass}>The aMaze name, branding, user interface, application design, proprietary code, documentation, and other original platform components may be protected by applicable intellectual property laws.</p>
            <p className={paragraphClass}>All rights not expressly granted to users are reserved by the relevant rights holders.</p>
            <p className={paragraphClass}>Users receive a limited, non-exclusive, non-transferable, revocable right to access and use the Service according to these Terms.</p>
            <p className={paragraphClass}>Third-party libraries, algorithms, frameworks, and components remain subject to their respective licences.</p>
            <p className={paragraphClass}>Nothing in these Terms overrides rights granted by applicable open-source software licences.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">12. Publication and Academic Use</h2>
            <p className={paragraphClass}>Users may incorporate lawfully generated aMaze outputs into scientific publications, dissertations, conference presentations, research reports, and academic materials.</p>
            <p className={paragraphClass}>Users remain responsible for the accuracy, reproducibility, methodological description, and scientific integrity of their findings.</p>
            <p className={paragraphClass}>Appropriate acknowledgement of software tools is encouraged where scientifically relevant or required by publication guidelines.</p>
            <p className={paragraphClass}>Use of aMaze does not imply endorsement of a study, manuscript, experimental protocol, or scientific conclusion by the Service operator.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">13. Third-Party Services</h2>
            <p className={paragraphClass}>aMaze may depend on third-party providers for authentication, infrastructure hosting, databases, storage, and associated technical services.</p>
            <p className={paragraphClass}>Examples may include Google authentication and external cloud or hosting infrastructure.</p>
            <p className={paragraphClass}>Use of these services may be subject to their respective terms and privacy policies.</p>
            <p className={paragraphClass}>aMaze is not responsible for independently operated third-party systems beyond the responsibilities imposed on the Service operator by applicable law and contractual obligations.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">14. Availability, Maintenance, and Modifications</h2>
            <p className={paragraphClass}>aMaze may undergo maintenance, upgrades, security updates, performance improvements, or infrastructure changes.</p>
            <p className={paragraphClass}>We aim to maintain reliable service availability but do not guarantee uninterrupted or error-free access.</p>
            <p className={paragraphClass}>Temporary disruptions may arise from network failures, hosting incidents, software defects, third-party outages, or other circumstances.</p>
            <p className={paragraphClass}>We may modify or discontinue specific features for legitimate operational, security, legal, or technical reasons.</p>
            <p className={paragraphClass}>Where reasonably practicable, users will be informed of material changes that affect access to important functionality or stored data.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">15. Fees and Future Paid Services</h2>
            <p className={paragraphClass}>Unless otherwise indicated, features designated as free may be accessed without payment.</p>
            <p className={paragraphClass}>aMaze may introduce optional subscriptions, paid processing features, expanded storage, institutional licences, or other paid services in the future.</p>
            <p className={paragraphClass}>Any applicable fees, billing arrangements, renewal conditions, and refund policies will be disclosed before users commit to a purchase.</p>
            <p className={paragraphClass}>No paid subscription or recurring charge will arise merely from accepting these Terms.</p>
            <p className={paragraphClass}>Additional terms may apply to future paid features.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">16. Privacy and Personal Information</h2>
            <p className={paragraphClass}>Collection, use, storage, and processing of personal information are described in the aMaze Privacy Policy.</p>
            <p className={paragraphClass}>
              <strong className="text-foreground">Privacy Policy: </strong>
              <Link
                to="/privacy-policy"
                className="text-primary underline underline-offset-4"
              >
                https://amaze.drvara.si/privacy-policy
              </Link>
            </p>
            <p className={paragraphClass}>By using the Service, users acknowledge that personal information will be handled as described in the Privacy Policy, subject to applicable legal requirements.</p>
            <p className={paragraphClass}>Any processing activity requiring separate consent will be conducted according to applicable law.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">17. Account Suspension and Termination</h2>
            <p className={paragraphClass}>Users may discontinue using aMaze at any time.</p>
            <p className={paragraphClass}>Where supported, users may initiate account deletion through:</p>
            <p className="font-medium text-foreground">Profile → Settings → Account → Delete Account</p>
            <p className={paragraphClass}>aMaze may suspend or terminate access when reasonably necessary because of material violations of these Terms, security threats, fraudulent activity, or legal obligations.</p>
            <p className={paragraphClass}>Where appropriate and practicable, users may be given notice or an opportunity to address the relevant issue.</p>
            <p className={paragraphClass}>Account termination may affect access to stored projects and analytical outputs.</p>
            <p className={paragraphClass}>Data deletion and retention following termination will be handled according to the Privacy Policy and applicable law.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">18. Disclaimers</h2>
            <p className={paragraphClass}>The Service is provided on an &quot;as available&quot; basis.</p>
            <p className={paragraphClass}>To the extent permitted by applicable law, aMaze disclaims warranties that the Service will be uninterrupted, free from defects, or suitable for every scientific or experimental application.</p>
            <p className={paragraphClass}>aMaze does not warrant that its results independently establish experimental validity, regulatory compliance, biological causation, or the accuracy of scientific conclusions.</p>
            <p className={paragraphClass}>Users should independently review and validate results before relying on them for research decisions, publication, institutional reporting, or regulatory submissions.</p>
            <p className={paragraphClass}>Nothing in these Terms excludes warranties or rights that cannot lawfully be excluded.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">19. Limitation of Liability</h2>
            <p className={paragraphClass}>To the maximum extent permitted by applicable law, the Service operator will not be liable for indirect, incidental, special, or consequential losses arising from use of or inability to use aMaze, including lost research opportunities, loss of anticipated results, or interruptions to research activities.</p>
            <p className={paragraphClass}>The Service operator&apos;s liability for direct losses will be determined in accordance with applicable law and any separate agreement governing the relevant service.</p>
            <p className={paragraphClass}>Nothing in these Terms excludes or limits liability for fraud, wilful misconduct, or other liability that cannot legally be excluded or restricted.</p>
            <p className={paragraphClass}>Users are encouraged to maintain independent backups and verify research outputs.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">20. Indemnification</h2>
            <p className={paragraphClass}>To the extent permitted by applicable law, users agree to indemnify the Service operator against third-party claims, damages, and reasonable costs arising from their unlawful use of the Service, infringement of third-party rights, or material breach of these Terms.</p>
            <p className={paragraphClass}>This provision does not apply to the extent a claim results from the Service operator&apos;s own unlawful conduct, negligence, or breach of applicable duties.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">21. Changes to Terms</h2>
            <p className={paragraphClass}>We may update these Terms to reflect changes in applicable law, platform functionality, security requirements, or operational practices.</p>
            <p className={paragraphClass}>The latest version will be published on the website with an updated effective date.</p>
            <p className={paragraphClass}>Material changes will be communicated through appropriate channels where required by law or reasonably practicable.</p>
            <p className={paragraphClass}>Continued use after revised Terms take effect may constitute acceptance where legally permitted. Where affirmative agreement is required, users will be asked to provide it.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">22. Governing Law and Dispute Resolution</h2>
            <p className={paragraphClass}>These Terms are governed by the laws of India, subject to any mandatory legal rights or rules applicable to particular users.</p>
            <p className={paragraphClass}>Subject to applicable jurisdictional requirements and any enforceable dispute-resolution arrangements, disputes relating to the Service shall fall within the jurisdiction of competent courts in Kolkata, West Bengal, India.</p>
            <p className={paragraphClass}>Nothing in this section limits rights or remedies that cannot be waived under applicable law.</p>
            <p className={paragraphClass}>Users are encouraged to contact the Service operator first to seek an amicable resolution of any issue.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">23. Severability</h2>
            <p className={paragraphClass}>If any provision of these Terms is held invalid or unenforceable by a competent authority, the remaining provisions will continue in effect to the extent permitted by law.</p>
            <p className={paragraphClass}>An unenforceable provision will be interpreted or limited only as necessary to preserve its lawful purpose where possible.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">24. Contact Information</h2>
            <p className={paragraphClass}>For account support, research-data concerns, technical issues, or questions regarding these Terms, contact:</p>
            <address className="space-y-1 not-italic leading-7 text-muted-foreground">
              <p className="font-semibold text-foreground">aMaze — Support</p>
              <p>
                Website:{" "}
                <a href="https://amaze.drvara.si/" className="text-primary underline underline-offset-4">
                  https://amaze.drvara.si
                </a>
              </p>
              <p>Email: vaaroninnovations@gmail.com</p>
              <p>Operator: Dr. Vara Prasad Saka</p>
              <p>Business Address: Kolkata</p>
            </address>
          </section>

        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
