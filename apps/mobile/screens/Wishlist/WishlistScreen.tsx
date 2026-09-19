import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";

export function WishlistScreen() {
  return (
    <ScreenContainer title="My Wishlist">
      <EmptyState
        icon="heart-outline"
        title="Your wishlist is empty"
        description="Save cards you're looking for once the card database is available."
      />
    </ScreenContainer>
  );
}
