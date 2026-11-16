import { Link } from "react-router-dom";

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#cdd6e5] bg-white/40 backdrop-blur-xs dark:border-white/[0.08] dark:bg-[#0a111d]/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 font-mono text-[11px] tracking-wide text-[#596780] sm:px-8 dark:text-[#92a1bb] lg:px-10">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-[#223048] dark:text-[#d7e1f3]">
            © {currentYear}{" "}
            <a
              href="https://drvara.si"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2a5ed3] transition-colors hover:underline dark:text-[#71b8ff]"
            >
              @drvara.si
            </a>
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span>aMaze Automated Rodent Tracking &amp; Analysis</span>
          <span className="hidden sm:inline text-muted-foreground/60">·</span>
          <span className="inline-flex items-center rounded-sm bg-[#2a5ed3]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#2a5ed3] uppercase tracking-wider dark:bg-[#71b8ff]/15 dark:text-[#71b8ff]">
            RUO (Research Use Only)
          </span>
        </div>

        <nav
          aria-label="Legal and contact navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 uppercase text-[10px] tracking-wider"
        >
          <Link
            to="/privacy"
            className="text-[#2a5ed3] underline-offset-4 hover:underline dark:text-[#71b8ff]"
          >
            Privacy Statement
          </Link>
          <Link
            to="/disclaimer"
            className="text-[#2a5ed3] underline-offset-4 hover:underline dark:text-[#71b8ff]"
          >
            Disclaimer
          </Link>
          <Link
            to="/terms"
            className="text-[#2a5ed3] underline-offset-4 hover:underline dark:text-[#71b8ff]"
          >
            Terms of Service
          </Link>
          <Link
            to="/contact"
            className="text-[#2a5ed3] underline-offset-4 hover:underline dark:text-[#71b8ff]"
          >
            Contact
          </Link>
          <a
            href="https://drvara.si"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            drvara.si ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
