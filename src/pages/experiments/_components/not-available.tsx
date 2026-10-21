import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  ErrorState,
  ErrorStateContent,
  ErrorStateDescription,
  ErrorStateHeader,
  ErrorStateMedia,
  ErrorStateTitle,
} from "@/components/ui/error-state.tsx";

export default function NotAvailable({ what }: { what: string }) {
  return (
    <ErrorState className="mx-auto mt-10 max-w-lg">
      <ErrorStateHeader>
        <ErrorStateMedia variant="icon">
          <AlertTriangle />
        </ErrorStateMedia>
        <ErrorStateTitle>{what} not available</ErrorStateTitle>
        <ErrorStateDescription>It may have been deleted, or it belongs to another account.</ErrorStateDescription>
      </ErrorStateHeader>
      <ErrorStateContent>
        <Button size="sm" asChild>
          <Link to="/experiments">Back to experiments</Link>
        </Button>
      </ErrorStateContent>
    </ErrorState>
  );
}
