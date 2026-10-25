import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Mail,
  Printer,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import AppHeader from "@/components/app-header.tsx";
import SiteFooter from "@/components/site-footer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  badge?: string;
  children: ReactNode;
}

const LEGAL_TABS = [
  {
    to: "/privacy",
    aliases: ["/privacy-policy"],
    label: "Privacy Statement",
    icon: ShieldCheck,
  },
  {
    to: "/disclaimer",
    aliases: [],
    label: "Disclaimer",
    icon: AlertTriangle,
  },
  {
    to: "/terms",
    aliases: ["/terms-of-service"],
    label: "Terms of Service",
    icon: FileText,
  },
  {
    to: "/contact",
    aliases: ["/contact-us"],
    label: "Contact",
    icon: Mail,
  },
];

export default function LegalLayout({
  title,
  subtitle,
  lastUpdated = "October 2026",
  badge = "Official Policy",
  children,
}: LegalLayoutProps) {
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Page link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f5f9f8] text-[#142d31] dark:bg-[#071318] dark:text-[#e5f1f0] flex flex-col justify-between">
      <div>
        <AppHeader />

        {/* Hero Banner */}
        <section className="relative border-b border-[#c9d9d7] bg-linear-to-b from-white via-white/80 to-[#f0f6f5] py-12 px-4 dark:border-white/[0.08] dark:from-[#091a20] dark:via-[#08171c] dark:to-[#071318] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {/* Breadcrumb & Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
                <span>/</span>
                <span className="text-[#08796f] dark:text-[#59dbc7]">Legal &amp; Compliance</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-[#08796f]/30 bg-[#08796f]/10 text-[#08796f] dark:text-[#59dbc7]">
                  {badge}
                </Badge>
                <span className="text-muted-foreground">Effective: {lastUpdated}</span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#142d31] sm:text-4xl dark:text-[#e5f1f0]">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4b6362] dark:text-[#91a7a4] sm:text-base">
                  {subtitle}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-8 gap-1.5 text-xs font-mono"
                >
                  {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "Copied" : "Copy Link"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 gap-1.5 text-xs font-mono"
                >
                  <Printer className="size-3.5" />
                  <span>Print Document</span>
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-8 flex flex-wrap gap-2 border-t border-[#c9d9d7]/80 pt-4 dark:border-white/[0.08] print:hidden">
              {LEGAL_TABS.map((tab) => {
                const isActive =
                  location.pathname === tab.to ||
                  tab.aliases.includes(location.pathname);
                const Icon = tab.icon;

                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#08796f] text-white shadow-xs dark:bg-[#59dbc7] dark:text-[#062024]"
                        : "bg-white/80 text-[#3b5352] hover:bg-white hover:text-[#183538] dark:bg-[#0c1f24] dark:text-[#8ba7a5] dark:hover:bg-[#10272d] dark:hover:text-[#e0eeec] border border-[#c9d9d7] dark:border-white/[0.08]"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Main Document Content */}
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#c9d9d7] bg-white/95 p-6 shadow-xs sm:p-10 dark:border-white/[0.08] dark:bg-[#0b1b20]/90">
            {children}

            {/* Bottom Copyright Notice */}
            <div className="mt-12 border-t border-[#c9d9d7]/70 pt-6 text-xs text-muted-foreground font-mono flex flex-wrap items-center justify-between gap-3 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span>Copyright © {new Date().getFullYear()}</span>
                <a
                  href="https://drvara.si"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#08796f] hover:underline dark:text-[#59dbc7] flex items-center gap-1"
                >
                  @drvara.si
                  <ExternalLink className="size-3" />
                </a>
                <span>· All rights reserved.</span>
              </div>
              <div>
                <span>Official documentation for aMaze Behavioral Suite</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
