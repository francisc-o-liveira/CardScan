import { Database } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CardDatabasePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Card Database</h1>
      <EmptyState
        icon={Database}
        title="The card database isn't loaded yet"
        description="Pokémon and Magic card data will be searchable here once the catalog is imported."
      />
    </div>
  );
}
