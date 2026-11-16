import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { BrandMark, BrandWordmark } from "@/components/brand-logo.tsx";
import heroImage from "../../generated-image-1791186058084.png";
import {
  ArrowRight,
  Crosshair,
  Grid3x3,
  LineChart,
  Lock,
  ScanSearch,
  Timer,
} from "lucide-react";
import AppHeader from "@/components/app-header.tsx";
import RodentBackground from "@/components/rodent-background.tsx";
import { Button } from "@/components/ui/button.tsx";
import AccountAuthDialog from "@/components/account-auth-dialog.tsx";
import SiteFooter from "@/components/site-footer.tsx";
import { TEMPLATES } from "@/lib/tracking/templates.ts";
import { api } from "@/convex/_generated/api.js";

const STATS = [
  { label: "center", value: "14.2", unit: "s" },
  { label: "dist", value: "1,284", unit: "cm" },
];

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Auto arena detection",
    text: "Builds a clean background from the video and finds the arena outline and shape for you.",
  },
  {
    icon: Grid3x3,
    title: "Zones in one click",
    text: "Standard test layouts generate their regions of interest instantly. Resize, rotate, re-arrange.",
  },
  {
    icon: Crosshair,
    title: "Robust tracking",
    text: "Background subtraction or contrast detection, with identity kept between frames.",
  },
  {
    icon: Timer,
    title: "Zone measures",
    text: "Time, entries, latency and distance per zone, plus speed and immobility.",
  },
  {
    icon: LineChart,
    title: "Trajectory overlay",
    text: "Watch the path build up live on top of the video while tracking runs.",
  },
  {
    icon: Lock,
    title: "Private by design",
    text: "Videos are processed by the authenticated tracking service. Only clips attached to saved trials are kept in Convex Storage.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function Index() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState<"signIn" | "signUp">("signUp");

  const openWorkspace = (destination: string) => {
    if (isLoading) return;
    if (isAuthenticated) {
      navigate(destination);
      return;
    }
    navigate(`/login?redirectTo=${encodeURIComponent(destination)}`);
  };

  return (
    <div className="relative isolate min-h-screen bg-[#f6f8fc] text-[#1d293e] selection:bg-[#246cec]/20 dark:bg-[#0a111d] dark:text-[#e8eefa] dark:selection:bg-[#7ebeff]/25">
      <AccountAuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultMode={authDialogMode}
        redirectTo="/dashboard"
      />
      <RodentBackground />
      <div className="relative z-10 isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_25%,rgba(50,91,186,0.13),transparent_38%),radial-gradient(ellipse_at_84%_42%,rgba(44,78,155,0.1),transparent_34%)] dark:bg-[radial-gradient(ellipse_at_18%_25%,rgba(50,91,186,0.2),transparent_38%),radial-gradient(ellipse_at_84%_42%,rgba(44,78,155,0.17),transparent_34%)]"
        />
        <AppHeader />

        <section className="relative overflow-hidden border-b border-[#cdd6e5] dark:border-white/[0.08]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(48,77,143,0.065)_1px,transparent_1px),linear-gradient(to_bottom,rgba(48,77,143,0.065)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_78%)] dark:bg-[linear-gradient(to_right,rgba(123,177,234,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(123,177,234,0.07)_1px,transparent_1px)]"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-10 lg:py-28">
            <div className="relative z-10 space-y-7">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="flex items-center gap-[0.12em] text-[clamp(4.5rem,11vw,9rem)] font-bold leading-[0.9] tracking-[-0.06em]"
              >
                <BrandMark className="size-[0.95em]" />
                <BrandWordmark className="pb-[0.08em] pr-[0.05em] tracking-[-0.06em]" />
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease }}
                className="flex items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#4c5c79] sm:text-xs dark:text-[#8ea0c0]"
              >
                <span className="h-px w-8 bg-[#2a5ed3] dark:bg-[#6cb5ff]" />
                Advanced Rodent Behaviour Tracking &amp; Analytics
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16, ease }}
                className="max-w-2xl text-balance text-[clamp(2.5rem,5.2vw,4.5rem)] font-medium leading-[0.96] tracking-[-0.065em] text-[#1c283d] dark:text-[#f1f6ff]"
              >
                Mapping Movement.
                <span className="mt-2 block text-[#2a5ed3] dark:text-[#6bb5ff]">
                  Measuring Behaviour.
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16, ease }}
                className="max-w-lg text-base leading-7 text-[#4d5a71] sm:text-lg sm:leading-8 dark:text-[#a6b1c4]"
              >
                aMaze detects your arena, generates zones for standard tests and
                measures what your animal does. No install, no license dongle.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.24, ease }}
                className="flex flex-wrap gap-3 pt-1"
              >
                <Button
                  size="lg"
                  disabled={isLoading}
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate("/dashboard");
                    } else {
                      navigate("/login");
                    }
                  }}
                  className="h-12 border border-[#2a5ed3] bg-[#2a5ed3] px-6 font-semibold text-white shadow-[0_0_28px_rgba(42,94,211,0.16)] hover:bg-[#2752bc] dark:border-[#78bbff]/25 dark:bg-[#52a7ff] dark:text-[#0a1222] dark:shadow-[0_0_28px_rgba(82,167,255,0.18)] dark:hover:bg-[#7fbeff]"
                >
                  Start tracking <ArrowRight />
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  disabled={isLoading}
                  onClick={() => navigate("/track")}
                  className="h-12 border border-[#b2bbcc] bg-white/70 px-5 text-[#2a3850] hover:bg-white hover:text-[#1a263d] dark:border-white/10 dark:bg-white/[0.045] dark:text-[#d4dcea] dark:hover:bg-white/[0.09] dark:hover:text-white"
                >
                  Try the demo video
                </Button>
              </motion.div>
              <div className="flex items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#596780] dark:text-[#7f8ca3]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2a5ed3] opacity-30 dark:bg-[#6cb5ff] dark:opacity-40" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#2a5ed3] dark:bg-[#6cb5ff]" />
                </span>
                Precise tracking · Quantitative insight
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease }}
              className="relative mx-auto w-full max-w-2xl lg:ml-auto"
            >
              <div className="absolute -inset-5 rounded-[2rem] bg-[#2a5ed3]/[0.09] blur-2xl dark:bg-[#60afff]/[0.07]" />
              <div className="relative overflow-hidden rounded-2xl border border-[#bccce9] bg-white p-2 shadow-[0_22px_70px_rgba(38,54,89,0.16)] dark:border-[#75baff]/20 dark:bg-[#101827] dark:shadow-[0_28px_100px_rgba(0,0,0,0.48)]">
                <div className="flex items-center justify-between border-b border-[#d8dfec] px-3 pb-3 pt-1 sm:px-4 dark:border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex gap-1">
                      <i className="size-1.5 rounded-full bg-[#2a5ed3]" />
                      <i className="size-1.5 rounded-full bg-[#2a5ed3]/45 dark:bg-[#6ab4ff]/45" />
                      <i className="size-1.5 rounded-full bg-[#2a5ed3]/20 dark:bg-[#6ab4ff]/20" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#586883] sm:text-[10px] dark:text-[#95a2bb]">
                      Open field
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[#2a5ed3] sm:text-[10px] dark:text-[#71b8ff]">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#2a5ed3] dark:bg-[#71b8ff]" />
                    Analysis
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-lg bg-[#ecf0f8] dark:bg-[#0c111c]">
                  <img
                    src={heroImage}
                    alt="Mouse tracked inside an open-field arena"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)_52%,rgba(24,36,60,0.12))] dark:bg-[linear-gradient(180deg,rgba(9,16,28,0.08),rgba(9,16,28,0.03)_52%,rgba(9,16,28,0.45))]" />
                  <div className="absolute left-3 top-3 rounded border border-[#b0c1df] bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur sm:left-4 sm:top-4 dark:border-[#8ac4ff]/25 dark:bg-[#07181ce8] dark:shadow-none">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#52617d] dark:text-[#8f9ebb]">
                      Arena detection
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-[#263452] sm:text-xs dark:text-[#e7f0ff]">
                      <ScanSearch className="size-3 text-[#2a5ed3] dark:text-[#7ebeff]" />
                      Open field
                    </p>
                  </div>
                  <div className="absolute bottom-3 right-3 rounded border border-[#b0c1df] bg-white/95 px-2.5 py-2 font-mono text-[9px] text-[#52617d] shadow-sm backdrop-blur sm:bottom-4 sm:right-4 dark:border-white/10 dark:bg-[#07181ce8] dark:text-[#96a3bc] dark:shadow-none">
                    <span className="text-[#2a5ed3] dark:text-[#7ebeff]">
                      ●
                    </span>{" "}
                    TRACKING
                    <span className="ml-2 text-[#263452] dark:text-white">
                      00:14.2
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#d8dfec] pt-1 dark:divide-white/[0.08]">
                  {STATS.map((stat) => (
                    <div key={stat.label} className="px-2 py-3 sm:px-4 sm:py-4">
                      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#596780] sm:text-[9px] dark:text-[#7f8ca3]">
                        {stat.label}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-mono text-lg font-medium tracking-tight text-[#21304a] sm:text-2xl dark:text-[#ecf3ff]">
                          {stat.value}
                        </span>
                        <span className="font-mono text-[9px] text-[#596780] dark:text-[#98a5bc]">
                          {stat.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20 lg:px-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2a5ed3] dark:text-[#70b7ff]">
                Built for your methodology
              </p>
              <h2 className="text-2xl font-medium tracking-tight text-[#1d293e] sm:text-3xl dark:text-[#ecf3fe]">
                Built for the tests you run
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.filter((t) => t.id !== "custom").map((t) => (
              <span
                key={t.id}
                className="flex items-center gap-2 rounded-md border border-[#cad4e6] bg-white/75 px-3 py-2 text-sm text-[#2f3d58] transition-colors hover:border-[#2a5ed3]/50 hover:bg-[#e8f0fe] dark:border-white/[0.09] dark:bg-white/[0.025] dark:text-[#c6cfdd] dark:hover:border-[#67b3ff]/40 dark:hover:bg-[#67b3ff]/[0.06]"
              >
                <span className="font-mono text-[10px] tracking-wider text-[#2a5ed3] dark:text-[#71b8ff]">
                  {t.short}
                </span>
                {t.name}
              </span>
            ))}
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, index) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-xl border border-[#cad4e6] bg-white/85 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2a5ed3]/40 hover:bg-white dark:border-white/[0.08] dark:bg-[#101827]/75 dark:hover:border-[#67b3ff]/30 dark:hover:bg-[#151f30]"
              >
                <span className="absolute right-4 top-4 font-mono text-[9px] text-[#79869c] dark:text-white/20">
                  0{index + 1}
                </span>
                <div className="mb-5 grid size-10 place-items-center rounded-lg border border-[#2a5ed3]/20 bg-[#2a5ed3]/[0.07] dark:border-[#71b8ff]/15 dark:bg-[#71b8ff]/[0.07]">
                  <f.icon className="size-[18px] text-[#2a5ed3] dark:text-[#71b8ff]" />
                </div>
                <h3 className="mb-2 font-medium tracking-tight text-[#223048] dark:text-[#e3ebf9]">
                  {f.title}
                </h3>
                <p className="text-sm leading-6 text-[#525e74] dark:text-[#96a2b7]">
                  {f.text}
                </p>
                <div className="mt-5 h-px w-8 bg-[#2a5ed3]/65 transition-all duration-300 group-hover:w-14 dark:bg-[#71b8ff]/50" />
              </div>
            ))}
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
