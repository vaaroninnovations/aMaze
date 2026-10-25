import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#c9d9d7] dark:border-white/[0.08]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 font-mono text-[10px] uppercase tracking-wider text-[#526d6b] sm:px-8 dark:text-[#78918f] lg:px-10">
        <span>
          © {new Date().getFullYear()} aMaze · Advanced Rodent Behaviour
          Tracking &amp; Analytics
        </span>
        <nav
          aria-label="Legal and contact links"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <Link
            to="/contact"
            className="text-primary underline-offset-4 hover:underline"
          >
            Contact Us
          </Link>
          <Link
            to="/privacy-policy"
            className="text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-of-service"
            className="text-primary underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>
          <span>For research use</span>
        </nav>
      </div>
    </footer>
  );
}
