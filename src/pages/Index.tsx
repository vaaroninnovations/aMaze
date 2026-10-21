import { motion } from "motion/react";
import { Link } from "react-router-dom";
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
import { TEMPLATES } from "@/lib/tracking/templates.ts";

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
    text: "Videos are processed in your browser and never leave your computer.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function Index() {
  return (
    <div className="relative isolate min-h-screen bg-[#f5f9f8] text-[#142d31] selection:bg-[#0b887b]/20 dark:bg-[#071318] dark:text-[#e5f1f0] dark:selection:bg-[#5be2ce]/25">
      <RodentBackground />
      <div className="relative z-10 isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_25%,rgba(29,112,107,0.13),transparent_38%),radial-gradient(ellipse_at_84%_42%,rgba(20,95,91,0.1),transparent_34%)] dark:bg-[radial-gradient(ellipse_at_18%_25%,rgba(29,112,107,0.2),transparent_38%),radial-gradient(ellipse_at_84%_42%,rgba(20,95,91,0.17),transparent_34%)]"
        />
        <AppHeader>
          <Button
            size="sm"
            asChild
            className="border border-[#08796f] bg-[#08796f] text-white shadow-[0_0_24px_rgba(8,121,111,0.16)] hover:bg-[#066b62] dark:border-[#65ddcc]/25 dark:bg-[#44cbb9] dark:text-[#041614] dark:shadow-[0_0_24px_rgba(68,203,185,0.18)] dark:hover:bg-[#6de0d1]"
          >
            <Link to="/track">
              Open workspace <ArrowRight />
            </Link>
          </Button>
        </AppHeader>

        <section className="relative overflow-hidden border-b border-[#c9d9d7] dark:border-white/[0.08]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(28,92,87,0.065)_1px,transparent_1px),linear-gradient(to_bottom,rgba(28,92,87,0.065)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_78%)] dark:bg-[linear-gradient(to_right,rgba(144,201,196,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(144,201,196,0.07)_1px,transparent_1px)]"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-10 lg:py-28">
            <div className="relative z-10 space-y-7">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="text-[clamp(4.5rem,11vw,9rem)] font-semibold leading-[0.82] tracking-[-0.085em] text-[#132c30] dark:text-[#eff8f6]"
              >
                aMaze
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease }}
                className="flex items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#426361] sm:text-xs dark:text-[#84a7a5]"
              >
                <span className="h-px w-8 bg-[#08796f] dark:bg-[#52d9c5]" />
                Advanced Rodent Behaviour Tracking &amp; Analytics
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16, ease }}
                className="max-w-2xl text-balance text-[clamp(2.5rem,5.2vw,4.5rem)] font-medium leading-[0.96] tracking-[-0.065em] text-[#132c30] dark:text-[#eff8f6]"
              >
                Mapping Movement.
                <span className="mt-2 block text-[#08796f] dark:text-[#54d8c5]">
                  Measuring Behaviour.
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16, ease }}
                className="max-w-lg text-base leading-7 text-[#465f61] sm:text-lg sm:leading-8 dark:text-[#a1b5b3]"
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
                  asChild
                  className="h-12 border border-[#08796f] bg-[#08796f] px-6 font-semibold text-white shadow-[0_0_28px_rgba(8,121,111,0.16)] hover:bg-[#066b62] dark:border-[#65ddcc]/25 dark:bg-[#44cbb9] dark:text-[#041614] dark:shadow-[0_0_28px_rgba(68,203,185,0.18)] dark:hover:bg-[#6de0d1]"
                >
                  <Link to="/track">
                    Start tracking <ArrowRight />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                  className="h-12 border border-[#aebfbd] bg-white/70 px-5 text-[#203d40] hover:bg-white hover:text-[#102b30] dark:border-white/10 dark:bg-white/[0.045] dark:text-[#d1dfdd] dark:hover:bg-white/[0.09] dark:hover:text-white"
                >
                  <Link to="/track?demo=1">Try the demo video</Link>
                </Button>
              </motion.div>
              <div className="flex items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#526d6b] dark:text-[#78918f]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#08796f] opacity-30 dark:bg-[#52d9c5] dark:opacity-40" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#08796f] dark:bg-[#52d9c5]" />
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
              <div className="absolute -inset-5 rounded-[2rem] bg-[#08796f]/[0.09] blur-2xl dark:bg-[#46d3c0]/[0.07]" />
              <div className="relative overflow-hidden rounded-2xl border border-[#b5d3cf] bg-white p-2 shadow-[0_22px_70px_rgba(21,63,61,0.16)] dark:border-[#8dd4ca]/20 dark:bg-[#0b1b20] dark:shadow-[0_28px_100px_rgba(0,0,0,0.48)]">
                <div className="flex items-center justify-between border-b border-[#d5e2e0] px-3 pb-3 pt-1 sm:px-4 dark:border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex gap-1">
                      <i className="size-1.5 rounded-full bg-[#08796f]" />
                      <i className="size-1.5 rounded-full bg-[#08796f]/45 dark:bg-[#52d8c4]/45" />
                      <i className="size-1.5 rounded-full bg-[#08796f]/20 dark:bg-[#52d8c4]/20" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#506e6b] sm:text-[10px] dark:text-[#8ea8a5]">
                      Open field
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[#08796f] sm:text-[10px] dark:text-[#67d9c7]">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#08796f] dark:bg-[#67d9c7]" />
                    Analysis
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-lg bg-[#eaf2f1] dark:bg-[#091317]">
                  <div
                    role="img"
                    aria-label="Open field arena with tracking zones"
                    className="aspect-[4/3] w-full bg-[radial-gradient(ellipse_at_center,rgba(33,130,118,0.16),transparent_68%),linear-gradient(145deg,#eaf2f1,#dce9e7)] dark:bg-[radial-gradient(ellipse_at_center,rgba(43,152,137,0.2),transparent_68%),linear-gradient(145deg,#0e2226,#081519)]"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 600 450"
                      preserveAspectRatio="none"
                      className="size-full"
                    >
                      <rect
                        x="92"
                        y="38"
                        width="416"
                        height="374"
                        rx="12"
                        fill="rgba(15, 105, 97, 0.035)"
                        stroke="rgba(38, 112, 106, 0.52)"
                        strokeWidth="2"
                      />
                      <rect
                        x="196"
                        y="132"
                        width="208"
                        height="186"
                        rx="8"
                        fill="rgba(15, 105, 97, 0.08)"
                        stroke="rgba(38, 112, 106, 0.36)"
                        strokeDasharray="6 5"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M300 38v94m0 186v94M92 225h104m208 0h104"
                        stroke="rgba(38, 112, 106, 0.24)"
                        strokeDasharray="4 6"
                      />
                      <circle
                        cx="300"
                        cy="225"
                        r="8"
                        fill="#08796f"
                        opacity=".8"
                      />
                    </svg>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0)_52%,rgba(12,42,42,0.12))] dark:bg-[linear-gradient(180deg,rgba(5,18,22,0.08),rgba(5,18,22,0.03)_52%,rgba(5,18,22,0.45))]" />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 600 450"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 size-full"
                  >
                    <defs>
                      <filter
                        id="trajectory-glow"
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                      >
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      d="M196 235 C205 221 215 238 225 219 S250 207 253 222 S276 244 287 225 S306 197 318 211 S330 245 347 228 S361 194 375 206 S381 235 402 222"
                      fill="none"
                      stroke="#6bf0d9"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="5 3"
                      filter="url(#trajectory-glow)"
                    />
                    <circle cx="402" cy="222" r="5" fill="#8effe8" />
                    <circle
                      cx="402"
                      cy="222"
                      r="12"
                      fill="none"
                      stroke="#8effe8"
                      strokeOpacity=".65"
                    />
                  </svg>
                  <div className="absolute left-3 top-3 rounded border border-[#a9c8c3] bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur sm:left-4 sm:top-4 dark:border-[#74e6d3]/25 dark:bg-[#07181ce8] dark:shadow-none">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#496865] dark:text-[#87a5a1]">
                      Arena detection
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-[#173c3b] sm:text-xs dark:text-[#d9f7f1]">
                      <ScanSearch className="size-3 text-[#08796f] dark:text-[#5be2ce]" />
                      Open field
                    </p>
                  </div>
                  <div className="absolute bottom-3 right-3 rounded border border-[#a9c8c3] bg-white/95 px-2.5 py-2 font-mono text-[9px] text-[#496865] shadow-sm backdrop-blur sm:bottom-4 sm:right-4 dark:border-white/10 dark:bg-[#07181ce8] dark:text-[#8fa9a6] dark:shadow-none">
                    <span className="text-[#08796f] dark:text-[#5be2ce]">
                      ●
                    </span>{" "}
                    TRACKING
                    <span className="ml-2 text-[#173c3b] dark:text-white">
                      00:14.2
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#d5e2e0] pt-1 dark:divide-white/[0.08]">
                  {STATS.map((stat) => (
                    <div key={stat.label} className="px-2 py-3 sm:px-4 sm:py-4">
                      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#526d6b] sm:text-[9px] dark:text-[#78918f]">
                        {stat.label}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-mono text-lg font-medium tracking-tight text-[#153638] sm:text-2xl dark:text-[#e8f6f3]">
                          {stat.value}
                        </span>
                        <span className="font-mono text-[9px] text-[#526d6b] dark:text-[#92aaa7]">
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
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#08796f] dark:text-[#5bdac6]">
                Built for your methodology
              </p>
              <h2 className="text-2xl font-medium tracking-tight text-[#142d31] sm:text-3xl dark:text-[#eaf5f3]">
                Built for the tests you run
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.filter((t) => t.id !== "custom").map((t) => (
              <span
                key={t.id}
                className="flex items-center gap-2 rounded-md border border-[#c6d8d5] bg-white/75 px-3 py-2 text-sm text-[#244347] transition-colors hover:border-[#08796f]/50 hover:bg-[#e5f3f0] dark:border-white/[0.09] dark:bg-white/[0.025] dark:text-[#c3d2d0] dark:hover:border-[#57d6c2]/40 dark:hover:bg-[#57d6c2]/[0.06]"
              >
                <span className="font-mono text-[10px] tracking-wider text-[#08796f] dark:text-[#59dbc7]">
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
                className="group relative overflow-hidden rounded-xl border border-[#c6d8d5] bg-white/85 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#08796f]/40 hover:bg-white dark:border-white/[0.08] dark:bg-[#0b1b20]/75 dark:hover:border-[#57d6c2]/30 dark:hover:bg-[#0e2227]"
              >
                <span className="absolute right-4 top-4 font-mono text-[9px] text-[#738b89] dark:text-white/20">
                  0{index + 1}
                </span>
                <div className="mb-5 grid size-10 place-items-center rounded-lg border border-[#08796f]/20 bg-[#08796f]/[0.07] dark:border-[#59dbc7]/15 dark:bg-[#59dbc7]/[0.07]">
                  <f.icon className="size-[18px] text-[#08796f] dark:text-[#59dbc7]" />
                </div>
                <h3 className="mb-2 font-medium tracking-tight text-[#183538] dark:text-[#e0eeec]">
                  {f.title}
                </h3>
                <p className="text-sm leading-6 text-[#4b6362] dark:text-[#91a7a4]">
                  {f.text}
                </p>
                <div className="mt-5 h-px w-8 bg-[#08796f]/65 transition-all duration-300 group-hover:w-14 dark:bg-[#59dbc7]/50" />
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-[#c9d9d7] dark:border-white/[0.08]">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5 py-6 font-mono text-[10px] uppercase tracking-wider text-[#526d6b] sm:px-8 dark:text-[#78918f] lg:px-10">
            <span>
              © {new Date().getFullYear()} aMaze · Advanced Rodent Behaviour
              Tracking &amp; Analytics
            </span>
            <span>For research use</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
