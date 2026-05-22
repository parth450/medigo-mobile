import React, { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  View,
  ScrollView,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { loginApi, getProfileApi } from "../../api/auth.api";
import { AuthStorage } from "../../store/auth.store";
import type { User } from "../../types/auth.types";

interface Props {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function LoginScreen({ setUser }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true); // Tracks password hidden status
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      Alert.alert("Validation", "Email and password required");
      return;
    }

    try {
      setLoading(true);

      const loginData = await loginApi({
        email: cleanEmail,
        password: cleanPassword,
      });

      AuthStorage.setToken(loginData.access_token);

      const profileResponse = await getProfileApi();

      const user: User = {
        id: profileResponse.user.user_id,
        name: profileResponse.user.name || "Pharmacist Desk",
        email: cleanEmail,
        role: profileResponse.user.role, 
      };

      if (user.role === "admin") {
        Alert.alert("Access Denied", "Admins must use the central web panel.");
        return;
      }

      AuthStorage.setUser(user);
      setUser(user);

    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const backendMessage = error.response?.data?.message;
        const fallbackError = typeof backendMessage === 'string' 
          ? backendMessage 
          : JSON.stringify(error.response?.data);

        Alert.alert(
          "Login Failed",
          fallbackError || "Network connection failed. Verify server status."
        );
      } else {
        Alert.alert("Error", "Unexpected engine exception occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Upper Identity Branding Elements */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="medkit" size={46} color="#fff" />
          </View>
          <Text style={styles.title}>MediGo</Text>
          <Text style={styles.subtitle}>Pharmacy Management System</Text>
        </View>

        {/* Input Control Card Panel */}
        <View style={styles.card}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          {/* Container holding the text input and the eye toggle absolute icon */}
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.passwordInput}
            />
            <Pressable 
              style={styles.eyeIcon} 
              onPress={() => setSecureText(!secureText)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={secureText ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color="#6B7280" 
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#0D9488",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0D9488",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#475569",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 24,
    shadowColor: "#475569",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    borderRadius: 14,
    marginBottom: 18,
    fontSize: 15,
    color: "#0F172A",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    marginBottom: 18,
    position: "relative",
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    paddingRight: 48, // Padding space to stop text from overriding eye icon layer
    fontSize: 15,
    color: "#0F172A",
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#0D9488",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: "#0D9488",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: "#A7F3D0",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
});