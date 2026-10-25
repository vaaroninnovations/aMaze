import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  Layers,
  Sparkles,
  Timer,
  User,
} from "lucide-react";
import { toast } from "sonner";
import AnimalStack, { ANIMAL_CARDS, type AnimalCardData } from "./components/animal-stack.tsx";
import MazeCoverflow, { MAZE_LIST, type MazeConfig } from "./components/maze-coverflow.tsx";
import ExperimentTimer from "./components/experiment-timer.tsx";
import ThemeToggle from "@/components/theme-toggle.tsx";
import SiteFooter from "@/components/site-footer.tsx";
import { Button } from "@/components/ui/button.tsx";

type SetupStep = "animal" | "maze" | "timer";

export default function ExperimentalSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || "proj-active";

  // Step state
  const [currentStep, setCurrentStep] = useState<SetupStep>("animal");

  // Selected State
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalCardData>(ANIMAL_CARDS[0]);
  const [selectedMaze, setSelectedMaze] = useState<MazeConfig>(MAZE_LIST[0]);
  const [species, setSpecies] = useState<"Mouse" | "Rat">("Rat");
  const [colorContrast, setColorContrast] = useState<"White" | "Black">("White");

  // Keep species & color in sync with selected animal initially (inverting contrast)
  const handleAnimalSelect = useCallback((animal: AnimalCardData) => {
    setSelectedAnimal(animal);
    setSpecies(animal.species);
    setColorContrast(animal.color === "White" ? "Black" : "White");
  }, []);

  const handleMazeSelect = useCallback((
    maze: MazeConfig,
    chosenSpecies: "Mouse" | "Rat",
    chosenColor: "White" | "Black"
  ) => {
    setSelectedMaze(maze);
    setSpecies(chosenSpecies);
    setColorContrast(chosenColor);
  }, []);

  // Launch into the Experimental tracking page!
  const handleLaunchExperiment = (durationSeconds: number, habituationDelay: number) => {
    // Save trial configuration to localStorage for experimental session
    const setupData = {
      projectId,
      animal: selectedAnimal,
      maze: selectedMaze,
      species,
      colorContrast,
      durationSeconds,
      habituationDelay,
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem("amaze:active_trial_setup", JSON.stringify(setupData));

    toast.success("Experimental Protocol Configured!", {
      description: `Entering tracking suite for ${selectedMaze.name} with ${selectedAnimal.name}.`,
    });

    navigate(`/experiment/run?projectId=${projectId}&maze=${selectedMaze.id}&species=${species}&duration=${durationSeconds}`);
  };

  return (
    <div className="min-h-screen bg-[#f7faf9] text-[#142d31] selection:bg-[#08796f]/20 dark:bg-[#071318] dark:text-[#e4f0ef]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#c8d9d7]/70 bg-white/80 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#071318]/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Breadcrumbs & Return */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-[#c8d9d7] bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-[#eef5f4] dark:border-white/10 dark:bg-[#0c1f25] dark:text-zinc-200"
            >
              <ArrowLeft className="size-3.5" />
              <span>Dashboard</span>
            </Link>

            <span className="text-muted-foreground/40">/</span>

            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
              <span className="text-xs font-bold tracking-tight text-foreground sm:text-sm">
                Experimental Setup
              </span>
            </div>
          </div>

          {/* Center: Stepper Progression */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Step 1: Animal */}
            <button
              type="button"
              onClick={() => setCurrentStep("animal")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold transition-all ${
                currentStep === "animal"
                  ? "bg-[#08796f] text-white shadow-xs dark:bg-[#44cbb9] dark:text-[#041614]"
                  : "bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-white/20 text-[10px]">1</span>
              <span>Animal</span>
            </button>

            <ChevronRight className="size-3.5 text-muted-foreground/50" />

            {/* Step 2: Maze Coverflow */}
            <button
              type="button"
              onClick={() => setCurrentStep("maze")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold transition-all ${
                currentStep === "maze"
                  ? "bg-[#08796f] text-white shadow-xs dark:bg-[#44cbb9] dark:text-[#041614]"
                  : "bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-white/20 text-[10px]">2</span>
              <span>3D Maze</span>
            </button>

            <ChevronRight className="size-3.5 text-muted-foreground/50" />

            {/* Step 3: Timer */}
            <button
              type="button"
              onClick={() => setCurrentStep("timer")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold transition-all ${
                currentStep === "timer"
                  ? "bg-[#08796f] text-white shadow-xs dark:bg-[#44cbb9] dark:text-[#041614]"
                  : "bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-white/20 text-[10px]">3</span>
              <span>Timer</span>
            </button>
          </div>

          {/* Right: Theme Toggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content View based on Stepper */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {currentStep === "animal" && (
          <AnimalStack
            selectedAnimalId={selectedAnimal.id}
            onSelectAnimal={handleAnimalSelect}
            onProceed={() => setCurrentStep("maze")}
          />
        )}

        {currentStep === "maze" && (
          <MazeCoverflow
            initialSpecies={species}
            initialColor={colorContrast}
            onSelectMaze={handleMazeSelect}
            onProceed={() => setCurrentStep("timer")}
            onBack={() => setCurrentStep("animal")}
          />
        )}

        {currentStep === "timer" && (
          <ExperimentTimer
            selectedAnimal={selectedAnimal}
            selectedMaze={selectedMaze}
            selectedSpecies={species}
            selectedColor={colorContrast}
            onLaunchExperiment={handleLaunchExperiment}
            onBack={() => setCurrentStep("maze")}
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
