import { useMemo, useRef, useState } from "react";
import { View, Text, Linking, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { R, T, CARD_ASPECT, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { Button } from "@/components/Button";

const VIEWFINDER_HEIGHT = 440;
/** The card outline covers 80% of the viewfinder height: the API falls back to the same area. */
const FRAME_HEIGHT = VIEWFINDER_HEIGHT * 0.8;

/**
 * The live camera with the card-shaped frame. Opens straight away once the camera is allowed, as the
 * scan flow in docs/design-system.md asks; until then it explains why the camera is needed.
 */
export function Viewfinder({ busy, onCapture }: { busy: boolean; onCapture: (photoUri: string) => void }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    if (!camera.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) onCapture(photo.uri);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.box, styles.centered]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.box, styles.centered, styles.padded]}>
        <Ionicons name="camera-outline" size={30} color="rgba(255,255,255,0.5)" />
        <Text style={styles.title}>Scan cards with your camera</Text>
        <Text style={styles.caption}>
          CardScan needs the camera to identify the card you hold up. Photos are only used for that.
        </Text>
        <View style={styles.permissionAction}>
          {permission.canAskAgain ? (
            <Button label="Allow camera" icon="camera-outline" variant="primary" onPress={() => requestPermission()} />
          ) : (
            <Button label="Open settings" icon="settings-outline" variant="primary" onPress={() => Linking.openSettings()} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.box}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />
        <View style={[StyleSheet.absoluteFill, styles.centered, { pointerEvents: "none" }]}>
          <View style={[styles.frame, { height: FRAME_HEIGHT, width: FRAME_HEIGHT * CARD_ASPECT }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
        {busy ? (
          <View style={[StyleSheet.absoluteFill, styles.centered, styles.busy]}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.busyText}>Identifying…</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.hint}>Position your card inside the frame</Text>
      <View style={styles.shutter}>
        <Button
          label={busy ? "Identifying…" : "Scan card"}
          icon="scan"
          variant="primary"
          isLoading={busy || capturing}
          disabled={!ready}
          onPress={capture}
        />
      </View>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    box: {
      height: VIEWFINDER_HEIGHT,
      borderRadius: R.xl,
      overflow: "hidden",
      backgroundColor: "#08080B",
      borderWidth: 1,
      borderColor: C.border,
    },
    centered: { alignItems: "center", justifyContent: "center" },
    padded: { paddingHorizontal: 24, gap: 10 },
    title: { color: "#fff", fontSize: T.section, fontWeight: "700", textAlign: "center" },
    caption: { color: "rgba(255,255,255,0.65)", fontSize: T.body, lineHeight: 21, textAlign: "center" },
    permissionAction: { marginTop: 8, alignSelf: "stretch" },
    frame: { borderRadius: R.sm + 2 },
    corner: { position: "absolute", width: 32, height: 32, borderColor: C.primary },
    cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
    cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
    busy: { backgroundColor: "rgba(0,0,0,0.55)", gap: 12 },
    busyText: { color: "#fff", fontSize: T.body, fontWeight: "600" },
    hint: { marginTop: 12, color: C.baseContentMuted, fontSize: T.meta, textAlign: "center" },
    shutter: { marginTop: 12 },
  });
