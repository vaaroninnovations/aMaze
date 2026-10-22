import AppHeader from "@/components/app-header.tsx";
import SiteFooter from "@/components/site-footer.tsx";

const sectionClass = "space-y-3";
const paragraphClass = "leading-7 text-muted-foreground";
const listClass = "list-disc space-y-1 pl-6 leading-7 text-muted-foreground";

export default function PrivacyPolicyPage() {
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
              Privacy Policy
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
                <dd className="inline">[Insert legal name of operator / organization]</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Contact: </dt>
                <dd className="inline">[Insert privacy support email]</dd>
              </div>
            </dl>
          </header>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className={paragraphClass}>
              Welcome to <strong className="text-foreground">aMaze</strong>, a web-based platform designed for tracking, analysing, and visualising laboratory animal behaviour during experimental maze-based studies.
            </p>
            <p className={paragraphClass}>
              We respect the privacy of our users and recognise the importance of safeguarding personal information, research data, uploaded experimental recordings, and analytical results.
            </p>
            <p className={paragraphClass}>
              This Privacy Policy explains how aMaze collects, uses, processes, stores, shares, and protects information when users access our website and associated services.
            </p>
            <p className={paragraphClass}>
              By using aMaze, users acknowledge the data practices described in this policy. Where applicable law requires consent for particular processing activities, we will obtain it separately.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <div className="space-y-2">
              <h3 className="font-semibold">2.1 Account Information</h3>
              <p className={paragraphClass}>When users register or sign in, we may collect:</p>
              <ul className={listClass}>
                <li>Full name and email address.</li>
                <li>Profile picture, when provided through an authentication provider.</li>
                <li>Authentication identifiers and account preferences.</li>
                <li>Account creation and last-login information.</li>
                <li>Information required to maintain secure user sessions.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">2.2 Google Authentication</h3>
              <p className={paragraphClass}>
                aMaze supports authentication through Google Sign-In.
              </p>
              <p className={paragraphClass}>
                When a user chooses Google authentication, aMaze may receive basic profile information authorised through the sign-in process, including their name, email address, profile picture, and unique account identifier.
              </p>
              <p className={paragraphClass}>
                This information is used exclusively for account authentication, user identification, profile management, and related account functionality.
              </p>
              <p className={paragraphClass}>
                aMaze does not request access to Gmail messages, Google Drive files, Google Contacts, or other unrelated Google account information through basic Google Sign-In.
              </p>
              <p className={paragraphClass}>
                Any additional Google permissions introduced in the future will require appropriate disclosure and authorisation.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">2.3 Research and Experimental Data</h3>
              <p className={paragraphClass}>Users may upload or generate scientific research data, including:</p>
              <ul className={listClass}>
                <li>Laboratory animal behavioural recordings and video files.</li>
                <li>Maze configuration and experimental parameters.</li>
                <li>Tracking coordinates, movement trajectories, and behavioural measurements.</li>
                <li>Experimental session information and analysis results.</li>
                <li>Graphs, statistical summaries, and exported reports.</li>
                <li>Saved projects and associated metadata.</li>
              </ul>
              <p className={paragraphClass}>
                These data are processed to provide the analytical functions requested by users.
              </p>
              <p className={paragraphClass}>
                Users remain responsible for ensuring that uploaded content is lawful and that they possess appropriate permissions to process and store it.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">2.4 Technical and Usage Information</h3>
              <p className={paragraphClass}>
                When users access aMaze, technical information may be processed, including IP addresses, browser type, operating system, timestamps, diagnostic information, and application error logs.
              </p>
              <p className={paragraphClass}>
                Such information may be necessary for application functionality, troubleshooting, security, and service improvement.
              </p>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">3. How We Use Information</h2>
            <p className={paragraphClass}>We process information for the following purposes:</p>
            <ol className="list-decimal space-y-1 pl-6 leading-7 text-muted-foreground">
              <li>Creating and managing user accounts.</li>
              <li>Authenticating users and maintaining secure sessions.</li>
              <li>Uploading, processing, analysing, and visualising experimental recordings.</li>
              <li>Saving, retrieving, downloading, and deleting user projects.</li>
              <li>Generating behavioural tracking outputs and scientific reports.</li>
              <li>Providing technical support and operational notifications.</li>
              <li>Monitoring application reliability and preventing unauthorised access.</li>
              <li>Complying with applicable legal obligations.</li>
            </ol>
            <p className={paragraphClass}>
              We do not use users&apos; private research data for unrelated scientific publications, commercial licensing, or advertising without an appropriate legal basis and required authorisation.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">4. Research Data Ownership and Confidentiality</h2>
            <p className={paragraphClass}>
              Users retain their existing rights and ownership interests in the research data, videos, project files, and analytical outputs they submit or generate through aMaze.
            </p>
            <p className={paragraphClass}>Uploading research data does not transfer intellectual property ownership to aMaze.</p>
            <p className={paragraphClass}>
              aMaze processes research information to provide its requested features. Access to stored research content is governed by application permissions and the operational requirements of the service.
            </p>
            <p className={paragraphClass}>
              Users are responsible for compliance with applicable institutional research policies, ethical approvals, animal research guidelines, intellectual property agreements, and confidentiality obligations.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">5. Data Storage and Processing</h2>
            <p className={paragraphClass}>
              aMaze may use external infrastructure, authentication platforms, databases, and server services to deliver its functionality.
            </p>
            <p className={paragraphClass}>
              Such services may include hosting providers, managed databases, and authentication providers.
            </p>
            <p className={paragraphClass}>
              Research data and account information may be processed or stored in jurisdictions outside the user&apos;s country, depending on the infrastructure configuration.
            </p>
            <p className={paragraphClass}>
              We seek to use appropriate technical and organisational safeguards to protect information against unauthorised access, alteration, disclosure, and loss.
            </p>
            <p className={paragraphClass}>No internet-based system can guarantee absolute security.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">6. Cookies and Authentication Sessions</h2>
            <p className={paragraphClass}>aMaze may use cookies or similar browser storage mechanisms necessary for:</p>
            <ul className={listClass}>
              <li>User authentication.</li>
              <li>Maintaining login sessions.</li>
              <li>Preserving application preferences.</li>
              <li>Providing security-related functionality.</li>
            </ul>
            <p className={paragraphClass}>
              Where optional analytics or non-essential cookies are implemented, aMaze will provide appropriate information and obtain consent where legally required.
            </p>
            <p className={paragraphClass}>
              Users may control some browser storage through their browser settings. Disabling essential storage mechanisms may prevent certain application features from functioning.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">7. Sharing of Information</h2>
            <p className={paragraphClass}>
              aMaze may share limited information with service providers when necessary to operate the platform, including authentication, hosting, database, and technical infrastructure providers.
            </p>
            <p className={paragraphClass}>
              Information may also be disclosed where legally required or reasonably necessary to investigate security incidents or protect the service and its users.
            </p>
            <p className={paragraphClass}><strong className="text-foreground">We do not sell users&apos; personal information or research data to advertisers or data brokers.</strong></p>
            <p className={paragraphClass}>We do not publicly disclose private research projects without user authorisation.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">8. Google User Data</h2>
            <p className={paragraphClass}>
              Information obtained through Google authentication is used to support sign-in, account identification, and related user-facing features.
            </p>
            <p className={paragraphClass}>
              aMaze&apos;s use of Google user information is subject to applicable Google API Services User Data Policy requirements.
            </p>
            <p className={paragraphClass}>
              Google authentication data will not be sold to data brokers, transferred to advertising platforms for targeted advertising, or used for unrelated profiling.
            </p>
            <p className={paragraphClass}>
              Users may review or revoke their Google account connection through their Google Account security settings.
            </p>
            <p className={paragraphClass}>
              Revoking Google access does not necessarily delete information already stored in aMaze. Users may separately request account or data deletion.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">9. Data Retention</h2>
            <p className={paragraphClass}>
              We retain account information, research projects, and associated technical records only for as long as reasonably necessary for legitimate service purposes, subject to applicable legal requirements and the platform&apos;s implemented retention settings.
            </p>
            <p className={paragraphClass}>Users may be able to delete individual projects from their project dashboard.</p>
            <p className={paragraphClass}>
              Account deletion may result in the removal of account information and associated project data, subject to necessary retention for security, legal compliance, or backup management.
            </p>
            <p className={paragraphClass}>
              Certain backup copies or security records may remain temporarily until their normal deletion cycle is completed.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">10. User Rights and Account Deletion</h2>
            <p className={paragraphClass}>Subject to applicable law, users may have rights to:</p>
            <ul className={listClass}>
              <li>Access information associated with their account.</li>
              <li>Correct inaccurate account details.</li>
              <li>Download available project outputs.</li>
              <li>Delete individual saved projects.</li>
              <li>Request deletion of their account and associated personal information.</li>
              <li>Withdraw consent where consent is the applicable basis for processing.</li>
              <li>Raise privacy concerns or complaints.</li>
            </ul>
            <p className={paragraphClass}>Users may access available account controls through:</p>
            <p className="font-medium text-foreground">Profile → Settings → Account → Delete Account</p>
            <p className={paragraphClass}>
              Deleting an account may permanently remove access to saved projects and analytical outputs. Users should download any required data before initiating deletion.
            </p>
            <p className={paragraphClass}>
              If account deletion cannot be completed through the application, users may contact <strong className="text-foreground">[privacy support email]</strong>.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">11. Data Security</h2>
            <p className={paragraphClass}>
              aMaze seeks to implement reasonable security measures appropriate to the nature of the information processed, including authenticated access, restricted system permissions, secure communication channels, and infrastructure-level protections.
            </p>
            <p className={paragraphClass}>
              Users are responsible for protecting their credentials, securing their devices, and avoiding unauthorised disclosure of account access.
            </p>
            <p className={paragraphClass}>Any suspected security incident should be reported through the designated support contact.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">12. Children&apos;s Privacy</h2>
            <p className={paragraphClass}>
              aMaze is designed for researchers, academic professionals, laboratory personnel, and other users conducting scientific experiments.
            </p>
            <p className={paragraphClass}>The service is not intended for individuals under 18 years of age.</p>
            <p className={paragraphClass}>We do not knowingly seek to collect personal information from children through the platform.</p>
            <p className={paragraphClass}>
              Where we become aware that a child&apos;s personal information has been collected without appropriate authorisation, we will take suitable steps consistent with applicable law.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">13. Scientific and Research Limitations</h2>
            <p className={paragraphClass}>
              aMaze provides computational tools for experimental behavioural tracking, measurement, visualisation, and analysis.
            </p>
            <p className={paragraphClass}>
              The platform does not independently certify experimental validity, research ethics compliance, or the scientific accuracy of every generated result.
            </p>
            <p className={paragraphClass}>
              Researchers remain responsible for experimental design, calibration, verification of analytical outputs, scientific interpretation, and compliance with applicable animal ethics requirements.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">14. International Users and Applicable Law</h2>
            <p className={paragraphClass}>aMaze may be accessed by researchers in different jurisdictions.</p>
            <p className={paragraphClass}>
              We aim to handle personal information consistently with applicable data protection requirements, including relevant provisions of India&apos;s Digital Personal Data Protection Act, 2023 and associated rules, where applicable.
            </p>
            <p className={paragraphClass}>Users in other jurisdictions may have additional rights under their local data protection legislation.</p>
            <p className={paragraphClass}>Requests concerning applicable privacy rights may be directed to the contact information below.</p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">15. Third-Party Services</h2>
            <p className={paragraphClass}>
              The platform may integrate third-party services for authentication, cloud hosting, database management, and other technical functions.
            </p>
            <p className={paragraphClass}>
              Such providers may process information according to their respective privacy policies and contractual obligations.
            </p>
            <p className={paragraphClass}>Users should review the privacy terms of external services where relevant.</p>
            <p className={paragraphClass}>
              aMaze is not responsible for independently operated third-party websites that users voluntarily access outside the platform.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">16. Changes to This Privacy Policy</h2>
            <p className={paragraphClass}>
              We may revise this Privacy Policy to reflect changes in application functionality, data processing practices, legal requirements, or security arrangements.
            </p>
            <p className={paragraphClass}>Updates will be published on this page with a revised effective date.</p>
            <p className={paragraphClass}>
              Where legally required, we will provide additional notice or obtain consent before introducing materially different data processing activities.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">17. Contact Information</h2>
            <p className={paragraphClass}>
              For privacy-related questions, requests for personal data access, correction, deletion, or reporting suspected unauthorised access, please contact:
            </p>
            <address className="space-y-1 not-italic leading-7 text-muted-foreground">
              <p className="font-semibold text-foreground">aMaze — Privacy Support</p>
              <p>
                Website:{" "}
                <a href="https://amaze.drvara.si/" className="text-primary underline underline-offset-4">
                  https://amaze.drvara.si
                </a>
              </p>
              <p>Email: [Insert privacy support email]</p>
              <p>Operator: [Insert legal name of operator / organization]</p>
              <p>Address: [Insert business contact address]</p>
            </address>
          </section>

        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
