import { useMemo } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { R, T, GUTTER, MIN_TOUCH, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** A bottom sheet with a list of options, the phone's counterpart of the web app's <select>. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.title}>{title}</Text>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, checked: active }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
              {active ? <Ionicons name="checkmark" size={18} color={C.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: {
      paddingTop: 18,
      paddingHorizontal: GUTTER,
      borderTopLeftRadius: R.xl,
      borderTopRightRadius: R.xl,
      backgroundColor: C.base200,
    },
    title: { color: C.baseContent, fontSize: T.section, fontWeight: "700", marginBottom: 8 },
    option: {
      minHeight: MIN_TOUCH,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
    },
    pressed: { opacity: 0.7 },
    label: { color: C.baseContent, fontSize: T.body },
    labelActive: { color: C.primary, fontWeight: "600" },
  });
