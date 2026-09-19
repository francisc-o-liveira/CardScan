import { Swords } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DecksPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">My Decks</h1>
      <EmptyState
        icon={Swords}
        title="No decks yet"
        description="Deck building for Pokémon and Magic is planned for a later update."
      />
    </div>
  );
}
