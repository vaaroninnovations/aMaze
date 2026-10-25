import { Slider } from "@/components/ui/slider.tsx";

type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
};

/** Labelled slider with a monospace value readout, used across tracking panels. */
export default function SliderRow({ label, value, min, max, step, format, onChange, disabled }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        className="cursor-pointer"
      />
    </div>
  );
}
