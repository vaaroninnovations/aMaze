import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import { cn } from "@/lib/utils.ts";

type Props = {
  step: string;
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  /** Lets the user fold the panel away by clicking its title. */
  collapsible?: boolean;
  defaultOpen?: boolean;
};

/** Numbered instrument-style panel used by every step of the tracking workflow. */
export default function PanelSection({ step, title, children, className, action, collapsible = false, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const heading = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="font-mono text-[11px] text-primary">{step}</span>
      <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
    </div>
  );

  if (!collapsible) {
    return (
      <section className={cn("rounded-lg border bg-card p-4", className)}>
        <header className="flex items-center justify-between gap-2 pb-3">
          {heading}
          {action}
        </header>
        <div className="space-y-3">{children}</div>
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section className={cn("rounded-lg border bg-card", className)}>
        <header className="flex items-center justify-between gap-2 p-4">
          <CollapsibleTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left" aria-label={`${open ? "Collapse" : "Expand"} ${title}`}>
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
            {heading}
          </CollapsibleTrigger>
          {action}
        </header>
        <CollapsibleContent className="space-y-3 px-4 pb-4">{children}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}
