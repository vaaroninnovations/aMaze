import type { DragEvent, ReactNode } from "react";
import { Camera, Upload } from "lucide-react";
import type { TemplateId } from "@/lib/tracking/types.ts";
import DemoMenu from "./demo-menu.tsx";
import { cn } from "@/lib/utils.ts";

type Props = {
  error: string | null;
  onUpload: () => void;
  onDropFile: (file: File | undefined) => void;
  onCamera: () => void;
  onDemo: (templateId: TemplateId) => void;
};

type OptionProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  onDrop?: (e: DragEvent<HTMLButtonElement>) => void;
};

function SourceOption({ icon, title, description, action, onClick, onDrop }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
      onDrop={onDrop}
      className={cn(
        "group flex cursor-pointer flex-col items-center gap-4 rounded-xl border border-dashed bg-card p-8 text-center transition-colors",
        "hover:border-primary hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105 [&_svg]:size-6">
        {icon}
      </span>
      <span className="space-y-1.5">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-balance text-muted-foreground">{description}</span>
      </span>
      <span className="mt-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
        {action}
      </span>
    </button>
  );
}

/** First screen of the workspace: choose where the behavior video comes from. */
export default function SourcePicker({ error, onUpload, onDropFile, onCamera, onDemo }: Props) {
  return (
    <div className="mx-auto mt-10 max-w-3xl space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Start a tracking session</h1>
        <p className="text-sm text-muted-foreground">
          Choose a video source. Everything is processed on your computer and never uploaded.
        </p>
      </div>
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <SourceOption
          icon={<Upload />}
          title="Upload video"
          description="Drop a file here or browse. Any format: MP4, MOV, AVI, MKV, WMV, MPEG and more."
          action="Choose file"
          onClick={onUpload}
          onDrop={(e) => {
            e.preventDefault();
            onDropFile(e.dataTransfer.files[0]);
          }}
        />
        <SourceOption
          icon={<Camera />}
          title="Use camera"
          description="Track in real time from a webcam or USB camera: live arena and zone detection, recording and analysis."
          action="Go live"
          onClick={onCamera}
        />
      </div>
      <div className="text-center">
        <DemoMenu onSelect={onDemo}>Or try a demo video</DemoMenu>
      </div>
    </div>
  );
}
