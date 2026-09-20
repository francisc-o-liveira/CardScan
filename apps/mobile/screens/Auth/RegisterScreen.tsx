import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { registerSchema, type RegisterInput } from "@cardscan/validation";
import { COLORS } from "@cardscan/config";
import { useAuth } from "@/providers/AuthProvider";

export function RegisterScreen() {
  const { register } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    // Controlled inputs must start with a value, or React warns when they switch from undefined.
    defaultValues: { username: "", email: "", password: "" },
  });

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null);
    try {
      await register(values);
      router.replace("/(tabs)");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create your account");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="scan-outline" size={28} color={COLORS.dark.primary} />
            </View>
            <Text style={styles.title}>CardScan</Text>
            <Text style={styles.subtitle}>Your TCG collection, one scan away.</Text>
          </View>

          {formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          )}

          <Text style={styles.label}>Username</Text>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                autoComplete="username"
                placeholder="cardmaster"
                placeholderTextColor={COLORS.dark.baseContentMuted}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.username && <Text style={styles.fieldError}>{errors.username.message}</Text>}

          <Text style={styles.label}>Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={COLORS.dark.baseContentMuted}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}

          <Text style={styles.label}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                secureTextEntry
                autoComplete="new-password"
                placeholder="••••••••"
                placeholderTextColor={COLORS.dark.baseContentMuted}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
          <Text style={styles.hint}>
            At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.dark.primaryContent} />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" replace>
              <Text style={styles.footerLink}>Sign in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.dark.base100 },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: "center", marginBottom: 28, gap: 6 },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(91,124,250,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: "600", color: COLORS.dark.baseContent },
  subtitle: { fontSize: 14, color: COLORS.dark.baseContentMuted, textAlign: "center" },
  label: { fontSize: 13, color: COLORS.dark.baseContentMuted, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.base200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark.baseContent,
  },
  hint: { color: COLORS.dark.baseContentMuted, fontSize: 12, marginTop: 6 },
  fieldError: { color: COLORS.dark.error, fontSize: 12, marginTop: 4 },
  errorBanner: {
    backgroundColor: "rgba(240,85,90,0.12)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  errorBannerText: { color: COLORS.dark.error, fontSize: 13 },
  button: {
    backgroundColor: COLORS.dark.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: COLORS.dark.primaryContent, fontSize: 15, fontWeight: "600" },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: COLORS.dark.baseContentMuted, fontSize: 13 },
  footerLink: { color: COLORS.dark.primary, fontSize: 13, fontWeight: "600" },
});
