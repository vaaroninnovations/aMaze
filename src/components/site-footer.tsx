import { Link } from "react-router-dom";

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#c9d9d7] bg-white/40 backdrop-blur-xs dark:border-white/[0.08] dark:bg-[#071318]/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 font-mono text-[11px] tracking-wide text-[#526d6b] sm:px-8 dark:text-[#8ba7a5] lg:px-10">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-[#183538] dark:text-[#d3e5e3]">
            © {currentYear}{" "}
            <a
              href="https://drvara.si"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#08796f] transition-colors hover:underline dark:text-[#59dbc7]"
            >
              @drvara.si
            </a>
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span>aMaze Automated Rodent Tracking &amp; Analysis</span>
          <span className="hidden sm:inline text-muted-foreground/60">·</span>
          <span className="inline-flex items-center rounded-sm bg-[#08796f]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#08796f] uppercase tracking-wider dark:bg-[#59dbc7]/15 dark:text-[#59dbc7]">
            RUO (Research Use Only)
          </span>
        </div>

        <nav
          aria-label="Legal and contact navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 uppercase text-[10px] tracking-wider"
        >
          <Link
            to="/privacy"
            className="text-[#08796f] underline-offset-4 hover:underline dark:text-[#59dbc7]"
          >
            Privacy Statement
          </Link>
          <Link
            to="/disclaimer"
            className="text-[#08796f] underline-offset-4 hover:underline dark:text-[#59dbc7]"
          >
            Disclaimer
          </Link>
          <Link
            to="/terms"
            className="text-[#08796f] underline-offset-4 hover:underline dark:text-[#59dbc7]"
          >
            Terms of Service
          </Link>
          <Link
            to="/contact"
            className="text-[#08796f] underline-offset-4 hover:underline dark:text-[#59dbc7]"
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
