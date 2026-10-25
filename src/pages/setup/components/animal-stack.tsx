import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export type AnimalTypeId = "white_rat" | "black_rat" | "white_mouse" | "black_mouse";

export interface AnimalCardData {
  id: AnimalTypeId;
  name: string;
  scientificName: string;
  strain: string;
  species: "Rat" | "Mouse";
  color: "White" | "Black";
  imageSrc: string;
  referenceDescription: string;
  avgWeight: string;
  adultLength: string;
  behaviorNotes: string;
  optimalContrast: string;
}

export const ANIMAL_CARDS: AnimalCardData[] = [
  {
    id: "white_rat",
    name: "White Rat",
    scientificName: "Rattus norvegicus",
    strain: "Sprague-Dawley / Wistar",
    species: "Rat",
    color: "White",
    imageSrc: "/animals/white-rat.jpg",
    referenceDescription: "Real Sprague-Dawley albino rat · studio reference photograph",
    avgWeight: "280 – 450 g",
    adultLength: "22 – 26 cm",
    behaviorNotes: "Docile, excellent spatial learning, well-suited for Morris Water Maze & Barnes Maze.",
    optimalContrast: "Dark matte arena floor (charcoal / black)",
  },
  {
    id: "black_rat",
    name: "Black Rat",
    scientificName: "Rattus norvegicus",
    strain: "Long-Evans / Hooded",
    species: "Rat",
    color: "Black",
    imageSrc: "/animals/black-rat.jpg",
    referenceDescription: "Real Long-Evans hooded rat · studio reference photograph",
    avgWeight: "300 – 480 g",
    adultLength: "23 – 27 cm",
    behaviorNotes: "Superior visual acuity, active exploration, high baseline locomotion.",
    optimalContrast: "Light matte arena floor (white / pale gray)",
  },
  {
    id: "white_mice",
    name: "White Mice",
    scientificName: "Mus musculus",
    strain: "BALB/c / CD-1 Albino",
    species: "Mouse",
    color: "White",
    imageSrc: "/animals/white-mouse.jpg",
    referenceDescription: "Real BALB/c albino mouse · matching uploaded reference photo",
    avgWeight: "25 – 35 g",
    adultLength: "7.5 – 10 cm",
    behaviorNotes: "Pronounced anxiogenic thigmotaxis, high sensitivity to light, ideal for Elevated Plus Maze.",
    optimalContrast: "Dark matte arena floor (charcoal / black)",
  },
  {
    id: "black_mice",
    name: "Black Mice",
    scientificName: "Mus musculus",
    strain: "C57BL/6J Inbred",
    species: "Mouse",
    color: "Black",
    imageSrc: "/animals/black-mouse.jpg",
    referenceDescription: "Real C57BL/6J inbred mouse · studio reference photograph",
    avgWeight: "22 – 30 g",
    adultLength: "7.5 – 9.5 cm",
    behaviorNotes: "Global neurobiology standard, robust locomotor drive, high exploratory activity.",
    optimalContrast: "Light matte arena floor (white / pale gray)",
  },
];

interface AnimalStackProps {
  selectedAnimalId: AnimalTypeId;
  onSelectAnimal: (animal: AnimalCardData) => void;
  onProceed: () => void;
}

export default function AnimalStack({
  selectedAnimalId,
  onSelectAnimal,
  onProceed,
}: AnimalStackProps) {
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = ANIMAL_CARDS.findIndex((a) => a.id === selectedAnimalId);
    return idx >= 0 ? idx : 0;
  });

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const stackContainerRef = useRef<HTMLDivElement>(null);
  const wheelAccumulatorRef = useRef(0);
  const lastWheelTimeRef = useRef(0);
  const totalCards = ANIMAL_CARDS.length;

  const currentAnimal = ANIMAL_CARDS[activeIndex];

  // Notify parent on active card change
  useEffect(() => {
    onSelectAnimal(ANIMAL_CARDS[activeIndex]);
  }, [activeIndex, onSelectAnimal]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalCards);
    setDragOffset(0);
  }, [totalCards]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalCards) % totalCards);
    setDragOffset(0);
  }, [totalCards]);

  // Mouse wheel responsive scrolling (smooth trackpad & physical mouse wheel)
  useEffect(() => {
    const el = stackContainerRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      wheelAccumulatorRef.current += delta;

      if (Math.abs(wheelAccumulatorRef.current) > 20 && now - lastWheelTimeRef.current > 180) {
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
  }, [handleNext, handlePrev]);

  // Pointer Drag Handlers (Loopem Drag-Snap style with touch and mouse drag physics)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startXRef.current;
    setDragOffset(delta);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const snapThreshold = 55;

    if (dragOffset > snapThreshold) {
      handlePrev();
    } else if (dragOffset < -snapThreshold) {
      handleNext();
    }
    setDragOffset(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <div className="flex w-full flex-col items-center px-2 sm:px-4">
      {/* Step Header Instructions */}
      <div className="mb-3 text-center sm:mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#08796f]/30 bg-[#08796f]/[0.08] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#08796f] dark:border-[#52d8c4]/30 dark:bg-[#52d8c4]/15 dark:text-[#52d8c4]">
          Step 1 · Subject Selection
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#132d30] sm:text-3xl dark:text-white">
          Choose Your Experimental Rodent
        </h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Click animal image to proceed to maze selection. Scroll mouse wheel or drag to cycle cards.
        </p>
      </div>

      {/* Quick Direct Animal Chips */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {ANIMAL_CARDS.map((animal, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={animal.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold transition-all ${
                isActive
                  ? "bg-[#08796f] text-white shadow-xs ring-2 ring-[#08796f]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:ring-[#44cbb9]/40"
                  : "border border-[#cde0dd] bg-white text-muted-foreground hover:bg-[#f2f8f7] dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              <span
                className={`size-2.5 rounded-full border ${
                  animal.color === "White"
                    ? "border-zinc-400 bg-white"
                    : "border-zinc-800 bg-zinc-950"
                }`}
              />
              <span>{animal.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3D Drag-Snap Card Stack Container - Mouse Wheel and Drag Responsive */}
      <div
        ref={stackContainerRef}
        className="relative flex h-[460px] w-full max-w-[420px] items-center justify-center touch-none select-none py-2 cursor-grab active:cursor-grabbing"
        style={{ perspective: "1200px" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        title="Scroll mouse wheel or drag horizontally to cycle animals"
      >
        {ANIMAL_CARDS.map((animal, index) => {
          // Circular relative offset from active card
          let diff = (index - activeIndex + totalCards) % totalCards;
          if (diff > totalCards / 2) diff -= totalCards;

          const isCenter = diff === 0;

          // Drag interpolation
          let translateX = diff * 85 + (isCenter ? dragOffset : 0);
          let translateZ = -Math.abs(diff) * 110;
          let rotateY = -diff * 18 + (isCenter ? (dragOffset / 400) * 15 : 0);
          let scale = 1 - Math.abs(diff) * 0.1;
          let opacity = Math.abs(diff) > 1 ? 0.35 : 1 - Math.abs(diff) * 0.22;
          let zIndex = 30 - Math.abs(diff) * 10;

          if (Math.abs(diff) > 1) {
            translateZ = -220;
            translateX = 0;
          }

          return (
            <div
              key={animal.id}
              onClick={() => {
                if (!isCenter) {
                  setActiveIndex(index);
                }
              }}
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex,
                transition: isDragging && isCenter ? "none" : "all 0.38s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className={`absolute top-0 flex h-[440px] w-[310px] sm:w-[350px] flex-col justify-between rounded-2xl border bg-white p-4 sm:p-5 shadow-xl transition-colors dark:bg-[#0c1c22] ${
                isCenter
                  ? "border-[#08796f] shadow-[0_20px_50px_rgba(8,121,111,0.22)] ring-2 ring-[#08796f]/40 dark:border-[#52d8c4] dark:ring-[#52d8c4]/40"
                  : "cursor-pointer border-[#cadad7] shadow-md dark:border-white/10"
              }`}
            >
              {/* Card Top: Plain & Clean - Name on the Top */}
              <div className="flex items-start justify-between border-b border-[#e2ecea] pb-2.5 dark:border-white/10">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[#123135] dark:text-[#f0f9f8]">
                    {animal.name}
                  </h3>
                  <p className="font-mono text-[11px] italic text-[#506e6b] dark:text-[#8ea9a6]">
                    {animal.scientificName} · {animal.strain}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] font-bold ${
                    animal.color === "White"
                      ? "border-zinc-300 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                      : "border-zinc-800 bg-zinc-900 text-white dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                  }`}
                >
                  {animal.species} · {animal.color}
                </Badge>
              </div>

              {/* Card Center: Real Photographic Reference Image (Plain, Click to go to Maze Selection) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnimal(animal);
                  onProceed();
                }}
                className="relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden py-1 rounded-xl"
              >
                <div className="relative flex h-52 w-full sm:h-56 items-center justify-center p-2">
                  <img
                    src={animal.imageSrc}
                    alt={animal.name}
                    className="max-h-full max-w-full object-contain rounded-lg drop-shadow-md transition-transform duration-300 hover:scale-105"
                    loading="eager"
                  />
                </div>
              </div>

              {/* Card Bottom: Specifications & Instant Select CTA */}
              <div className="space-y-2 border-t border-[#e2ecea] pt-2.5 text-xs dark:border-white/10">
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                  <div className="rounded-md bg-[#f4f8f7] p-1.5 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground block text-[9px] uppercase">Avg Weight</span>
                    <span className="font-bold text-[#143236] dark:text-[#e4f3f1]">{animal.avgWeight}</span>
                  </div>
                  <div className="rounded-md bg-[#f4f8f7] p-1.5 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground block text-[9px] uppercase">Body Length</span>
                    <span className="font-bold text-[#143236] dark:text-[#e4f3f1]">{animal.adultLength}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">
                    <strong className="text-foreground">Optimal Arena:</strong> {animal.optimalContrast.split("(")[0]}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAnimal(animal);
                      onProceed();
                    }}
                    className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#08796f] hover:underline dark:text-[#52d8c4]"
                  >
                    Select <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls & Direct Indicators */}
      <div className="mt-3 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          className="size-9 rounded-full border-[#bed4d1] bg-white text-foreground hover:bg-[#eaf3f1] dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          aria-label="Previous animal"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Indicator dots */}
        <div className="flex items-center gap-1.5">
          {ANIMAL_CARDS.map((a, idx) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeIndex
                  ? "w-6 bg-[#08796f] dark:bg-[#52d8c4]"
                  : "w-2 bg-[#bed4d1] hover:bg-[#08796f]/50 dark:bg-zinc-700"
              }`}
              title={a.name}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="size-9 rounded-full border-[#bed4d1] bg-white text-foreground hover:bg-[#eaf3f1] dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          aria-label="Next animal"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Primary Selection Confirm Button */}
      <div className="mt-5 flex flex-col items-center gap-1.5">
        <Button
          size="lg"
          onClick={onProceed}
          className="h-11 border border-[#08796f] bg-[#08796f] px-6 sm:px-8 font-semibold text-white shadow-md hover:bg-[#066a61] dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
        >
          <Check className="mr-1.5 size-4 stroke-[2.5]" />
          Select {currentAnimal.name} &amp; Configure Maze <ArrowRight className="ml-2 size-4" />
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground">
          Selected: <strong className="text-foreground">{currentAnimal.name}</strong> ({currentAnimal.strain})
        </span>
      </div>
    </div>
  );
}