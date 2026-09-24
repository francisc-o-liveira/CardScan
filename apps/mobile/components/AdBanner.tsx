import { View, StyleSheet } from "react-native";
import { useQuota } from "@/hooks/useQuota";
import { adsModule, bannerUnitId } from "@/services/ads";

/** A banner under the scan result. Only free users see it, only where the ads SDK exists, never over a card. */
export function AdBanner() {
  const { data } = useQuota();
  const ads = adsModule();
  if (!ads || !data || data.premium) return null;

  return (
    <View style={styles.wrap} accessibilityLabel="Advertisement">
      <ads.BannerAd unitId={bannerUnitId(ads)} size={ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { marginTop: 16, alignItems: "center" } });
