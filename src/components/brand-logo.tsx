import { useId } from "react";
import { cn } from "@/lib/utils.ts";

/** aMaze brand mark: a tracked mouse (red nose point, lime centroid) inside two maze corners. */
export function BrandMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className={cn("size-8 shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="40" y1="8" x2="24" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3fa9ff" />
          <stop offset="0.55" stopColor="#1f6feb" />
          <stop offset="1" stopColor="#1746d1" />
        </linearGradient>
      </defs>
      {/* Maze corners */}
      <path
        d="M5 29V9a4 4 0 0 1 4-4h26M59 37v19a4 4 0 0 1-4 4H31"
        strokeWidth="6"
        strokeLinecap="round"
        className="stroke-[#c9d6f2] dark:stroke-white/25"
      />
      {/* Tail */}
      <path
        d="M27 41c-3 7-14 5-20 9-3 2-4.5 5-5 8"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Body, head and ears */}
      <g fill={`url(#${id})`}>
        <path d="M54 11c-1 7-4 15-7 22-3 8-9 11-15 10-7-1-9-8-6-14 3-7 10-10 16-13 5-2 9-4 12-5Z" />
        <circle cx="38" cy="15.5" r="4.6" />
        <circle cx="52.5" cy="24.5" r="3.4" />
      </g>
      {/* Tracking points */}
      <circle cx="54" cy="11" r="2.4" fill="#ff3b30" />
      <circle cx="36.5" cy="31" r="2.5" fill="#b6e62e" />
    </svg>
  );
}

/** The "aMaze" wordmark in the logo's blue gradient. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-gradient-to-b from-[#3fa9ff] via-[#1f6feb] to-[#1746d1] bg-clip-text font-sans font-bold tracking-[-0.04em] text-transparent dark:from-[#8cc8ff] dark:via-[#52a7ff] dark:to-[#3b82f6]",
        className,
      )}
    >
      aMaze
    </span>
  );
}

export default function BrandLogo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className={markClassName} />
      <BrandWordmark className={cn("text-[17px]", wordmarkClassName)} />
    </span>
  );
}
