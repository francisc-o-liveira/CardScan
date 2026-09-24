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
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { BrandMark } from "@/components/AppHeader";
import { Ionicons } from "@expo/vector-icons";
import { registerSchema, type RegisterInput } from "@cardscan/validation";
import { useAuth } from "@/providers/AuthProvider";
import { clearOnboardingSeen } from "@/utils/onboarding";

export function RegisterScreen() {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
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
      // New accounts always see the welcome screens; AuthLayout does the redirect once signed in.
      await clearOnboardingSeen();
      await register(values);
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
            <View style={styles.brandRow}>
              <BrandMark />
            </View>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Start tracking your collection in a couple of minutes.</Text>
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
                placeholder="How other collectors will see you"
                placeholderTextColor={C.baseContentMuted}
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
                autoComplete="new-password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
          <Text style={styles.hint}>
            At least 8 characters, with an uppercase letter, a lowercase letter and a number.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={C.primaryContent} />
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

const createStyles = (C: Palette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.base100 },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: "flex-start", marginBottom: 28, gap: 6 },
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
  title: { fontSize: 26, fontWeight: "600", letterSpacing: -0.5, color: C.baseContent },
  subtitle: { fontSize: 14, color: C.baseContentMuted, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", color: C.baseContent, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: C.baseContent,
  },
  hint: { color: C.baseContentMuted, fontSize: 12, marginTop: 6 },
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
