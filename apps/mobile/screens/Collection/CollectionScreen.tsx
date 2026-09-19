import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";

export function CollectionScreen() {
  return (
    <ScreenContainer title="My Collection">
      <EmptyState
        icon="layers-outline"
        title="Your collection is empty"
        description="Once scanning and the card database are live, cards you own will be tracked here."
      />
    </ScreenContainer>
  );
}
