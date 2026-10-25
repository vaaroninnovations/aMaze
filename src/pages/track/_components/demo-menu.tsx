import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { TemplateId } from "@/lib/tracking/types.ts";
import { DEMO_TEMPLATES } from "../_lib/demo-scenes.ts";

type Props = {
  onSelect: (templateId: TemplateId) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
};

const OPTIONS: TemplateId[] = ["open-field", ...DEMO_TEMPLATES];

/** Lets users pick which maze the built-in demo video shows. */
export default function DemoMenu({ onSelect, disabled, children, className }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" disabled={disabled} className={className}>
          <FlaskConical /> {children}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Demo video for...</DropdownMenuLabel>
        {OPTIONS.map((id) => {
          const t = getTemplate(id);
          return (
            <DropdownMenuItem key={id} className="cursor-pointer" onSelect={() => onSelect(id)}>
              <span className="w-9 font-mono text-xs text-muted-foreground">{t.short}</span>
              {t.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
