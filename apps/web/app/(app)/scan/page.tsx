import { ScanLine } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Scan a Card</h1>
      <EmptyState
        icon={ScanLine}
        title="Card scanning is on its way"
        description="Camera-based recognition for Pokémon and Magic cards is coming in a future update. For now, you can explore the rest of CardScan."
      />
    </div>
  );
}
