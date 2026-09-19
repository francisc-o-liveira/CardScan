import { Heart } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">My Wishlist</h1>
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        description="Save cards you're looking for once the card database is available, and track target prices here."
      />
    </div>
  );
}
