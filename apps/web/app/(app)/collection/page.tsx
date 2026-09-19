import { Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CollectionPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">My Collection</h1>
      <EmptyState
        icon={Layers}
        title="Your collection is empty"
        description="Once scanning and the card database are live, cards you own will be tracked here — quantities, condition, and estimated value included."
      />
    </div>
  );
}
