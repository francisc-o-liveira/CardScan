import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CARD_CONDITIONS, CARD_CONDITION_LABELS, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "@cardscan/config";
import type { CardCondition, CardLanguage, CollectionEntry, CollectionItem } from "@cardscan/types";
import { R, T, type Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { OptionSheet } from "@/components/OptionSheet";
import { useRemoveCollectionItem, useUpdateCollectionItem } from "@/hooks/useCollection";

const CONDITION_OPTIONS = CARD_CONDITIONS.map((value) => ({ value, label: CARD_CONDITION_LABELS[value] }));
const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((value) => ({ value, label: LANGUAGE_LABELS[value] }));

function CopyRow({ item }: { item: CollectionItem }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const update = useUpdateCollectionItem();
  const remove = useRemoveCollectionItem();
  const [picker, setPicker] = useState<"condition" | "language" | null>(null);
  const busy = update.isPending || remove.isPending;
  const change = (input: { quantity?: number; condition?: CardCondition; language?: CardLanguage }) =>
    update.mutate({ itemId: item.id, ...input });

  return (
    <View style={[styles.row, busy && styles.busy]}>
      <View style={styles.stepper}>
        <Pressable
          disabled={busy}
          onPress={() => change({ quantity: item.quantity - 1 })}
          accessibilityRole="button"
          accessibilityLabel={item.quantity === 1 ? "Remove this copy" : "One fewer copy"}
          style={styles.step}
        >
          <Ionicons name="remove" size={18} color={C.baseContentMuted} />
        </Pressable>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <Pressable
          disabled={busy}
          onPress={() => change({ quantity: item.quantity + 1 })}
          accessibilityRole="button"
          accessibilityLabel="One more copy"
          style={styles.step}
        >
          <Ionicons name="add" size={18} color={C.baseContentMuted} />
        </Pressable>
      </View>

      <Pressable disabled={busy} onPress={() => setPicker("condition")} accessibilityRole="button" style={styles.field}>
        <Text style={styles.fieldText} numberOfLines={1}>
          {CARD_CONDITION_LABELS[item.condition]}
        </Text>
        <Ionicons name="chevron-down" size={14} color={C.baseContentFaint} />
      </Pressable>
      <Pressable disabled={busy} onPress={() => setPicker("language")} accessibilityRole="button" style={styles.field}>
        <Text style={styles.fieldText} numberOfLines={1}>
          {LANGUAGE_LABELS[item.language]}
        </Text>
        <Ionicons name="chevron-down" size={14} color={C.baseContentFaint} />
      </Pressable>

      <Pressable
        disabled={busy}
        onPress={() => remove.mutate(item.id)}
        accessibilityRole="button"
        accessibilityLabel="Remove these copies"
        style={styles.step}
      >
        <Ionicons name="trash-outline" size={18} color={C.error} />
      </Pressable>

      <OptionSheet
        visible={picker === "condition"}
        title="Condition"
        options={CONDITION_OPTIONS}
        selected={item.condition}
        onSelect={(condition) => change({ condition })}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "language"}
        title="Language"
        options={LANGUAGE_OPTIONS}
        selected={item.language}
        onSelect={(language) => change({ language })}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

/**
 * The copies of a card the user owns, one row per condition and language. Moving a row to a condition
 * and language the card already has merges the two (the API does that); 0 copies removes the row.
 */
export function OwnedCopies({ entry }: { entry: CollectionEntry }) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={styles.section}>
      <Text style={styles.title}>In your collection · {entry.quantity}</Text>
      {entry.items.map((item) => (
        <CopyRow key={item.id} item={item} />
      ))}
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    section: { marginTop: 28 },
    title: { color: C.baseContent, fontSize: T.section, fontWeight: "700", marginBottom: 4 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
    },
    busy: { opacity: 0.6 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
    step: {
      width: 36,
      height: 36,
      borderRadius: R.sm,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    quantity: { width: 28, textAlign: "center", color: C.baseContent, fontSize: T.body, fontWeight: "700" },
    field: {
      flex: 1,
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
      paddingHorizontal: 10,
      borderRadius: R.sm,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.base100,
    },
    fieldText: { flexShrink: 1, color: C.baseContent, fontSize: T.meta },
  });
