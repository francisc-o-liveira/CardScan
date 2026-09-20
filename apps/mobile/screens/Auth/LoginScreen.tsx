import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { loginSchema, type LoginInput } from "@cardscan/validation";
import { COLORS } from "@cardscan/config";
import { useAuth } from "@/providers/AuthProvider";

export function LoginScreen() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    // Controlled inputs must start with a value, or React warns when they switch from undefined.
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    try {
      await login(values);
      router.replace("/(tabs)");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to sign in");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="scan-outline" size={28} color={COLORS.dark.primary} />
            </View>
            <Text style={styles.title}>CardScan</Text>
            <Text style={styles.subtitle}>Scan. Identify. Collect.</Text>
          </View>

          {formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          )}

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
                autoComplete="current-password"
                placeholder="••••••••"
                placeholderTextColor={COLORS.dark.baseContentMuted}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.dark.primaryContent} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/register" replace>
              <Text style={styles.footerLink}>Create one</Text>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.dark.base100 },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 32, gap: 6 },
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
  subtitle: { fontSize: 14, color: COLORS.dark.baseContentMuted },
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
