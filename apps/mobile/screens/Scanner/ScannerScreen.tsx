import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState } from "@/components/EmptyState";

export function ScannerScreen() {
  return (
    <ScreenContainer title="Scan a Card">
      <EmptyState
        icon="scan-outline"
        title="Card scanning is on its way"
        description="Camera-based recognition for Pokémon and Magic cards is coming in a future update."
      />
    </ScreenContainer>
  );
}
