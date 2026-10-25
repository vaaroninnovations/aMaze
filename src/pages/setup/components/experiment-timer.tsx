import React, { useState } from "react";
import {
  Clock,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Flame,
  CheckCircle2,
  Timer as TimerIcon,
  Bell,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import type { AnimalCardData } from "./animal-stack.tsx";
import type { MazeConfig } from "./maze-coverflow.tsx";

interface ExperimentTimerProps {
  selectedAnimal: AnimalCardData;
  selectedMaze: MazeConfig;
  selectedSpecies: "Mouse" | "Rat";
  selectedColor: "White" | "Black";
  onLaunchExperiment: (durationSeconds: number, habituationDelay: number) => void;
  onBack: () => void;
}

export default function ExperimentTimer({
  selectedAnimal,
  selectedMaze,
  selectedSpecies,
  selectedColor,
  onLaunchExperiment,
  onBack,
}: ExperimentTimerProps) {
  // Timer State in Seconds (Default: 5 minutes = 300s)
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [habituationDelay, setHabituationDelay] = useState(5); // 5 sec habituation
  const [autoStopOnEscape, setAutoStopOnEscape] = useState(true);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const PRESETS = [
    { label: "03:00", seconds: 180, desc: "Quick Screening" },
    { label: "05:00", seconds: 300, desc: "Standard OFT / EPM" },
    { label: "10:00", seconds: 600, desc: "Standard Y-Maze / NOR" },
    { label: "15:00", seconds: 900, desc: "Extended Exploration" },
    { label: "20:00", seconds: 1200, desc: "Full Barnes Protocol" },
  ];

  const adjustTime = (deltaSeconds: number) => {
    setTotalSeconds((prev) => Math.max(30, Math.min(3600, prev + deltaSeconds)));
  };

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#08796f]/30 bg-[#08796f]/[0.08] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#08796f] dark:border-[#52d8c4]/30 dark:bg-[#52d8c4]/15 dark:text-[#52d8c4]">
          Step 3 · Trial Acquisition Timer
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#132d30] sm:text-3xl dark:text-white">
          Set Experimental Recording Duration
        </h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Select standard acquisition duration or adjust custom time before entering the experimental tracking suite.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-[1.2fr_0.8fr]">
        {/* Left: Timer Display & Presets */}
        <div className="flex flex-col items-center justify-between rounded-2xl border border-[#cde0dd] bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#0c1c22]">
          {/* Digital Clock Display */}
          <div className="flex flex-col items-center py-4">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#08796f] dark:text-[#52d8c4]">
              Recording Duration
            </span>
            <div className="my-2 flex items-baseline gap-1 font-mono text-6xl font-bold tracking-tight text-[#143236] sm:text-7xl dark:text-[#eaf5f3]">
              {formattedTime}
              <span className="text-xl font-normal text-muted-foreground">min</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Total {totalSeconds} seconds video tracking acquisition
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="w-full space-y-2 border-t border-[#e2ecea] pt-4 dark:border-white/10">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Standard Methodology Presets
            </span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {PRESETS.map((p) => {
                const isSelected = totalSeconds === p.seconds;
                return (
                  <button
                    key={p.seconds}
                    type="button"
                    onClick={() => setTotalSeconds(p.seconds)}
                    className={`flex flex-col items-center rounded-lg border py-2 text-center transition-all ${
                      isSelected
                        ? "border-[#08796f] bg-[#08796f]/10 text-[#08796f] ring-1 ring-[#08796f] dark:border-[#52d8c4] dark:bg-[#52d8c4]/20 dark:text-[#52d8c4]"
                        : "border-[#d8e6e4] bg-[#f9fcfa] text-[#1e3b3e] hover:border-[#08796f]/40 dark:border-white/10 dark:bg-white/[0.02] dark:text-[#cfe0de]"
                    }`}
                  >
                    <span className="font-mono text-sm font-bold">{p.label}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">{p.desc.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stepper Fine-tuning */}
          <div className="mt-4 flex w-full items-center justify-between gap-2 border-t border-[#e2ecea] pt-3 text-xs dark:border-white/10">
            <span className="font-medium text-muted-foreground">Adjust Duration:</span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(-60)}
                className="h-8 px-2 font-mono text-xs"
              >
                -1 min
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(-30)}
                className="h-8 px-2 font-mono text-xs"
              >
                -30s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(30)}
                className="h-8 px-2 font-mono text-xs"
              >
                +30s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(60)}
                className="h-8 px-2 font-mono text-xs"
              >
                +1 min
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Experimental Summary Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#cde0dd] bg-[#f8fbfa] p-5 shadow-md dark:border-white/10 dark:bg-[#0a181d]">
          <div className="space-y-4">
            <div className="border-b border-[#e0ece9] pb-3 dark:border-white/10">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#08796f] dark:text-[#52d8c4]">
                Protocol Summary
              </span>
              <h3 className="text-base font-bold text-[#143236] dark:text-white">
                Live Trial Configuration
              </h3>
            </div>

            {/* Selected Animal Item */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Experimental Subject:</span>
              <span className="font-semibold text-foreground">
                {selectedAnimal.name} ({selectedSpecies})
              </span>
            </div>

            {/* Selected Maze Item */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">3D Apparatus:</span>
              <span className="font-semibold text-foreground">
                {selectedMaze.name} ({selectedMaze.short})
              </span>
            </div>

            {/* Standard Apparatus Size */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Arena Sizing:</span>
              <span className="font-mono text-[11px] font-semibold text-[#08796f] dark:text-[#52d8c4]">
                Standard {selectedSpecies}
              </span>
            </div>

            {/* Contrast Mode */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Apparatus Contrast:</span>
              <span className="rounded bg-black/5 px-2 py-0.5 font-mono text-[10px] font-semibold dark:bg-white/10">
                {selectedColor === "Black" ? "Black Maze (White Animal)" : "White Maze (Black Animal)"}
              </span>
            </div>

            {/* Habituation Delay setting */}
            <div className="space-y-1.5 border-t border-[#e0ece9] pt-3 dark:border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Habituation Countdown:</span>
                <span className="font-mono font-bold">{habituationDelay}s</span>
              </div>
              <div className="flex gap-2">
                {[0, 3, 5, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setHabituationDelay(d)}
                    className={`flex-1 rounded py-1 font-mono text-[10px] font-semibold transition-colors ${
                      habituationDelay === d
                        ? "bg-[#08796f] text-white dark:bg-[#44cbb9] dark:text-[#041614]"
                        : "border border-[#cde0dd] bg-white text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]"
                    }`}
                  >
                    {d === 0 ? "Off" : `${d}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Launch */}
          <div className="pt-6">
            <Button
              size="lg"
              onClick={() => onLaunchExperiment(totalSeconds, habituationDelay)}
              className="w-full border border-[#08796f] bg-[#08796f] py-6 text-sm font-bold text-white shadow-lg hover:bg-[#066a61] dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
            >
              <Play className="mr-2 size-4 fill-current stroke-none" />
              Launch Experimental Page <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="mt-6">
        <Button variant="outline" size="sm" onClick={onBack} className="h-9 px-4 text-xs">
          Back to Maze Coverflow
        </Button>
      </div>
    </div>
  );
}
