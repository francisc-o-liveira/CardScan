import type { Palette } from "@/theme";
import { useColors } from "@/providers/ThemeProvider";
import { useState, useMemo } from "react";
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
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { loginSchema, type LoginInput } from "@cardscan/validation";
import { useAuth } from "@/providers/AuthProvider";

export function LoginScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
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
      // AuthLayout sends the signed-in user to the welcome screens the first time, Home afterwards.
      await login(values);
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
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="scan-outline" size={18} color={C.primary} />
              </View>
              <Text style={styles.brandText}>CardScan</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to pick up where you left off.</Text>
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
                placeholderTextColor={C.baseContentMuted}
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
              <ActivityIndicator color={C.primaryContent} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to CardScan? </Text>
            <Link href="/(auth)/register" replace>
              <Text style={styles.footerLink}>Create an account</Text>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.base100 },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "flex-start", marginBottom: 32, gap: 6 },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  brandText: { color: C.baseContent, fontSize: 16, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "600", color: C.baseContent },
  subtitle: { fontSize: 14, color: C.baseContentMuted },
  label: { fontSize: 13, color: C.baseContentMuted, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.base200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.baseContent,
  },
  fieldError: { color: C.error, fontSize: 12, marginTop: 4 },
  errorBanner: {
    backgroundColor: `${C.error}1F`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  errorBannerText: { color: C.error, fontSize: 13 },
  button: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: C.primaryContent, fontSize: 15, fontWeight: "600" },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: C.baseContentMuted, fontSize: 13 },
  footerLink: { color: C.primary, fontSize: 13, fontWeight: "600" },
});
