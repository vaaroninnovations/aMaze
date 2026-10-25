import { useRef, useState, type ReactNode } from "react";
import { ImageDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { downloadElementImage, type ImageFormat } from "@/lib/export-image.ts";

type Props = {
  /** File name without extension. */
  filename: string;
  children: ReactNode;
};

/** Wraps a visual (chart, path, heatmap) and adds a PNG / JPEG download menu above it. */
export default function ExportableFigure({ filename, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const save = async (format: ImageFormat) => {
    if (!ref.current) return;
    setBusy(true);
    try {
      await downloadElementImage(ref.current, filename, format);
    } catch {
      toast.error("Could not create the image. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy}>
              {busy ? <Spinner /> : <ImageDown />} Save image
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => save("png")} className="cursor-pointer">
              PNG (lossless)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => save("jpeg")} className="cursor-pointer">
              JPEG (smaller file)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div ref={ref} className="space-y-3 bg-background p-2">
        {children}
      </div>
    </div>
  );
}
