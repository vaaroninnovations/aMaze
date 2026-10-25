import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  ArrowRight,
  Maximize2,
  Layers,
  ArrowLeft,
} from "lucide-react";
import Maze3DView, { type MazeTypeId } from "./maze-3d-view.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export interface MazeConfig {
  id: MazeTypeId;
  name: string;
  short: string;
  category: string;
  description: string;
  mouseDimensions: string;
  ratDimensions: string;
  keyMeasures: string[];
}

export const MAZE_LIST: MazeConfig[] = [
  {
    id: "epm",
    name: "Elevated Plus Maze",
    short: "EPM",
    category: "Anxiety & Risk Assessment",
    description: "Standard cross-maze evaluating conflict between open-arm exploration and closed-arm thigmotaxis.",
    mouseDimensions: "Arms: 30 × 5 cm · Walls: 15 cm · Elev: 40 cm",
    ratDimensions: "Arms: 50 × 10 cm · Walls: 40 cm · Elev: 50 cm",
    keyMeasures: ["Open Arm Entries %", "Open Arm Time %", "Head Dips"],
  },
  {
    id: "y_maze",
    name: "Y-Maze Spontaneous Alternation",
    short: "Y-Maze",
    category: "Spatial Working Memory",
    description: "Three-arm symmetrical maze quantifying continuous spontaneous alternation heuristics.",
    mouseDimensions: "Arms: 35 × 5 cm · Walls: 10 cm · 120° Angle",
    ratDimensions: "Arms: 50 × 10 cm · Walls: 20 cm · 120° Angle",
    keyMeasures: ["Spontaneous Alternation %", "Total Arm Entries", "Triad Sequences"],
  },
  {
    id: "water_maze",
    name: "Morris Water Maze",
    short: "MWM",
    category: "Hippocampal Spatial Learning",
    description: "Circular tank with hidden submerged escape platform testing allocentric spatial navigation memory.",
    mouseDimensions: "Tank: 120 cm Ø · Depth: 50 cm · Island: 10 cm Ø",
    ratDimensions: "Tank: 180 cm Ø · Depth: 60 cm · Island: 15 cm Ø",
    keyMeasures: ["Escape Latency", "Target Quadrant Dwell %", "Annulus Crossings"],
  },
  {
    id: "barnes_maze",
    name: "Barnes Maze Spatial Task",
    short: "Barnes",
    category: "Non-Aversive Spatial Learning",
    description: "Circular dry open platform with 20 perimeter escape holes eliminating water-immersion stress.",
    mouseDimensions: "Disk: 92 cm Ø · Holes: 5 cm Ø · 20 Holes",
    ratDimensions: "Disk: 122 cm Ø · Holes: 10 cm Ø · 20 Holes",
    keyMeasures: ["Primary Latency", "Primary Errors", "Search Strategy Type"],
  },
  {
    id: "zero_maze",
    name: "Elevated Zero Maze",
    short: "EZM",
    category: "Unconditioned Anxiety",
    description: "Continuous annular runway eliminating ambiguous center-hub decisions of the standard plus maze.",
    mouseDimensions: "Runway: 46 cm Ø · Corridor: 5.5 cm · Wall: 15 cm",
    ratDimensions: "Runway: 105 cm Ø · Corridor: 10 cm · Wall: 30 cm",
    keyMeasures: ["Open Quadrant Time %", "Head Dips", "Stretch-Attend Postures"],
  },
  {
    id: "radial_arm",
    name: "Radial Arm Maze (8-Arm)",
    short: "RAM",
    category: "Working & Reference Memory",
    description: "Central octagonal arena with eight radiating corridors evaluating dual-memory component processing.",
    mouseDimensions: "Arms: 35 × 6 cm · Hub: 20 cm Ø",
    ratDimensions: "Arms: 60 × 12 cm · Hub: 35 cm Ø",
    keyMeasures: ["Working Memory Errors", "Reference Memory Errors", "Total Time"],
  },
  {
    id: "open_field",
    name: "Open Field Arena",
    short: "OFT",
    category: "Locomotor & Thigmotaxis",
    description: "High-throughput square arena quantifying spontaneous locomotion, center entry hesitation, and habituation.",
    mouseDimensions: "Box: 45 × 45 cm · Wall: 40 cm · Center: 20 × 20 cm",
    ratDimensions: "Box: 100 × 100 cm · Wall: 50 cm · Center: 40 × 40 cm",
    keyMeasures: ["Total Distance (cm)", "Center Zone Dwell %", "Freezing Episodes"],
  },
  {
    id: "three_zone",
    name: "3-Zone Sociability Chamber",
    short: "3ZC",
    category: "Sociability & Social Novelty",
    description: "Three-compartment box with wire conspecific enclosures testing sociability and social novelty preference.",
    mouseDimensions: "Box: 60 × 40 cm (3 × 20cm zones) · Wall: 22 cm",
    ratDimensions: "Box: 120 × 80 cm (3 × 40cm zones) · Wall: 40 cm",
    keyMeasures: ["Social Preference Index", "Stranger Dwell", "Sniff Time"],
  },
];

interface MazeCoverflowProps {
  initialSpecies?: "Mouse" | "Rat";
  initialColor?: "White" | "Black";
  onSelectMaze: (maze: MazeConfig, species: "Mouse" | "Rat", color: "White" | "Black") => void;
  onProceed: () => void;
  onBack: () => void;
}

export default function MazeCoverflow({
  initialSpecies = "Mouse",
  initialColor = "White",
  onSelectMaze,
  onProceed,
  onBack,
}: MazeCoverflowProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Per-card options state: Species (Mouse/Rat) and Color Contrast (White/Black)
  const [speciesState, setSpeciesState] = useState<"Mouse" | "Rat">(initialSpecies);
  const [colorState, setColorState] = useState<"White" | "Black">(initialColor);

  // Swipe / Drag & Wheel gesture state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const coverflowContainerRef = useRef<HTMLDivElement>(null);
  const wheelAccumulatorRef = useRef(0);
  const lastWheelTimeRef = useRef(0);

  const activeMaze = MAZE_LIST[activeIndex];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % MAZE_LIST.length);
    setDragOffset(0);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + MAZE_LIST.length) % MAZE_LIST.length);
    setDragOffset(0);
  };

  const handleConfirm = () => {
    onSelectMaze(activeMaze, speciesState, colorState);
    onProceed();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mouse wheel responsive scrolling (smooth trackpad & physical mouse wheel)
  useEffect(() => {
    const el = coverflowContainerRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      // Prevent browser default window scrolling while user is scrolling over the coverflow
      e.preventDefault();
      const now = performance.now();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      wheelAccumulatorRef.current += delta;

      if (Math.abs(wheelAccumulatorRef.current) > 22 && now - lastWheelTimeRef.current > 180) {
        if (wheelAccumulatorRef.current > 0) {
          handleNext();
        } else {
          handlePrev();
        }
        wheelAccumulatorRef.current = 0;
        lastWheelTimeRef.current = now;
      }
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, []);

  // Pointer drag for swipe
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - startXRef.current);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset > 60) {
      handlePrev();
    } else if (dragOffset < -60) {
      handleNext();
    }
    setDragOffset(0);
  };

  return (
    <div className="flex w-full flex-col items-center px-2 sm:px-4">
      {/* Header Info */}
      <div className="mb-4 text-center sm:mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#08796f]/30 bg-[#08796f]/[0.08] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#08796f] dark:border-[#52d8c4]/30 dark:bg-[#52d8c4]/15 dark:text-[#52d8c4]">
          Step 2 · 3D Apparatus Coverflow
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#132d30] sm:text-3xl dark:text-white">
          Select &amp; Customize Behavioral Maze
        </h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Click maze to proceed to timer. Scroll mouse wheel or drag horizontally to cycle mazes.
        </p>
      </div>

      {/* Quick Maze Paradigm Selector Strip */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {MAZE_LIST.map((m, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-semibold transition-all ${
                isActive
                  ? "bg-[#08796f] text-white shadow-sm ring-2 ring-[#08796f]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:ring-[#44cbb9]/40"
                  : "border border-[#cde0dd] bg-white text-muted-foreground hover:bg-[#f2f8f7] dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              {m.short}
            </button>
          );
        })}
      </div>

      {/* 3D Coverflow Container - Mouse Wheel and Drag Responsive */}
      <div
        ref={coverflowContainerRef}
        className="relative flex h-[510px] w-full max-w-5xl items-center justify-center overflow-visible py-2 touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ perspective: "1100px" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        title="Scroll mouse wheel or drag horizontally to cycle mazes"
      >
        {MAZE_LIST.map((maze, index) => {
          let diff = index - activeIndex;
          if (diff > MAZE_LIST.length / 2) diff -= MAZE_LIST.length;
          if (diff < -MAZE_LIST.length / 2) diff += MAZE_LIST.length;

          const isCenter = diff === 0;

          // Responsive Coverflow 3D Transform calculations
          const baseOffset = 200;
          let translateX = diff * baseOffset + (isCenter ? dragOffset : 0);
          let rotateY = diff === 0 ? (dragOffset / 300) * 15 : diff > 0 ? -38 : 38;
          let translateZ = diff === 0 ? 80 : -130;
          let scale = diff === 0 ? 1 : 0.82;
          let opacity = Math.abs(diff) > 2 ? 0 : diff === 0 ? 1 : 0.65;
          let zIndex = 30 - Math.abs(diff);

          if (Math.abs(diff) > 2) {
            opacity = 0;
            translateX = diff > 0 ? 460 : -460;
          }

          return (
            <div
              key={maze.id}
              onClick={() => {
                if (!isCenter) setActiveIndex(index);
              }}
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex,
                transition: isDragging && isCenter ? "none" : "all 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className={`absolute flex h-[490px] w-[310px] sm:w-[350px] flex-col justify-between rounded-2xl border bg-white p-4 shadow-xl transition-colors dark:bg-[#0c1c22] ${
                isCenter
                  ? "border-[#08796f] shadow-[0_24px_60px_rgba(8,121,111,0.22)] ring-2 ring-[#08796f]/40 dark:border-[#52d8c4] dark:ring-[#52d8c4]/40"
                  : "cursor-pointer border-[#cadad7] shadow-md dark:border-white/10"
              }`}
            >
              {/* Card Header: Short code, Name & Category */}
              <div className="flex items-start justify-between border-b border-[#e2ecea] pb-2 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-[#08796f]/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#08796f] dark:bg-[#52d8c4]/15 dark:text-[#52d8c4]">
                      {maze.short}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                      {maze.category}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base sm:text-lg font-bold tracking-tight text-[#143135] dark:text-[#f0f9f8]">
                    {maze.name}
                  </h3>
                </div>
              </div>

              {/* Card Center: Live Rotating 3D Maze (Plain, Click to proceed to Timer) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isCenter) {
                    setActiveIndex(index);
                  } else {
                    onSelectMaze(maze, speciesState, colorState);
                    onProceed();
                  }
                }}
                className="relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden py-1 rounded-xl transition-transform hover:scale-[1.02]"
                title={isCenter ? `Click to select ${maze.name} and proceed to Timer` : `Click to view ${maze.name}`}
              >
                <Maze3DView
                  mazeType={maze.id}
                  species={speciesState}
                  colorContrast={colorState}
                  className="h-44 w-full sm:h-48 pointer-events-none"
                  autoRotate={isCenter}
                />
              </div>

              {/* Card Options: Mice / Rat & Black / White CTA */}
              <div className="space-y-2 rounded-xl border border-[#d8e8e5] bg-[#f8fbfa] p-2.5 sm:p-3 dark:border-white/10 dark:bg-white/[0.02]">
                {/* Species Toggle: Mouse vs Rat */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Subject Species
                  </span>
                  <div className="flex rounded-md border border-[#cde0dd] bg-white p-0.5 dark:border-white/10 dark:bg-[#071318]">
                    {(["Mouse", "Rat"] as const).map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpeciesState(sp);
                        }}
                        className={`rounded px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                          speciesState === sp
                            ? "bg-[#08796f] text-white dark:bg-[#44cbb9] dark:text-[#041614]"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {sp === "Mouse" ? "🐁 Mouse" : "🐀 Rat"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contrast Pairing CTA: Black Maze (White Animal) vs White Maze (Black Animal) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Apparatus Contrast CTA
                    </span>
                    <span className="font-mono text-[9px] font-bold text-[#08796f] dark:text-[#52d8c4]">
                      {colorState === "Black" ? "Black Maze" : "White Maze"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-md border border-[#cde0dd] bg-white p-0.5 dark:border-white/10 dark:bg-[#071318]">
                    {/* Black CTA Button -> Black Maze with White Animal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setColorState("Black");
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded py-1 px-1.5 text-[10px] font-semibold transition-all ${
                        colorState === "Black"
                          ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-900"
                          : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="size-2 rounded-full bg-zinc-950 border border-zinc-500 inline-block" />
                      <span>Black</span>
                      <span className="rounded bg-white/20 px-1 py-0.2 font-mono text-[8px] text-zinc-300">White Animal</span>
                    </button>

                    {/* White CTA Button -> White Maze with Black Animal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setColorState("White");
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded py-1 px-1.5 text-[10px] font-semibold transition-all ${
                        colorState === "White"
                          ? "bg-zinc-100 text-zinc-900 shadow-xs dark:bg-zinc-200 dark:text-zinc-950"
                          : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="size-2 rounded-full bg-white border border-zinc-400 inline-block" />
                      <span>White</span>
                      <span className="rounded bg-black/10 px-1 py-0.2 font-mono text-[8px] text-zinc-700">Black Animal</span>
                    </button>
                  </div>
                </div>

                {/* Standard Dimensions Badge (Dynamically calculated based on species) */}
                <div className="rounded-md border border-[#cde0dd] bg-white px-2 py-1 font-mono text-[9px] sm:text-[10px] text-[#133033] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#dcf2ef]">
                  <span className="font-bold text-[#08796f] dark:text-[#52d8c4]">Standard {speciesState} Size: </span>
                  <span>{speciesState === "Rat" ? maze.ratDimensions : maze.mouseDimensions}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coverflow Navigation Buttons */}
      <div className="mt-3 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          className="size-9 rounded-full border-[#bed4d1] bg-white text-foreground hover:bg-[#eaf3f1] dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          aria-label="Previous maze"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {MAZE_LIST.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeIndex
                  ? "w-6 bg-[#08796f] dark:bg-[#52d8c4]"
                  : "w-2 bg-[#bed4d1] hover:bg-[#08796f]/50 dark:bg-zinc-700"
              }`}
              title={m.name}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="size-9 rounded-full border-[#bed4d1] bg-white text-foreground hover:bg-[#eaf3f1] dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          aria-label="Next maze"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Primary Action Buttons */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-11 border-[#cde0dd] px-5 dark:border-white/15"
        >
          <ArrowLeft className="mr-1.5 size-4" /> Back to Animal
        </Button>

        <Button
          size="lg"
          onClick={handleConfirm}
          className="h-11 border border-[#08796f] bg-[#08796f] px-6 sm:px-8 font-semibold text-white shadow-md hover:bg-[#066a61] dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
        >
          <Check className="mr-1.5 size-4 stroke-[2.5]" />
          Confirm {activeMaze.name} ({speciesState}) &amp; Set Timer
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}