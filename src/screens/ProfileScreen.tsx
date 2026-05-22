// src/screens/ProfileScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AuthStorage } from "../store/auth.store";
import { triggerLogout } from "../api/axiosClient";
import { useTheme } from "../store/theme.store"; 

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  pharmacist: "Pharmacist",
  store_manager: "Store Manager",
};

export default function ProfileScreen() {
  const user = AuthStorage.getUser();
  const { isDarkMode, toggleTheme } = useTheme(); //  Consume theme state and toggle trigger

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Logout Confirm",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => triggerLogout() },
      ]
    );
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={[styles.container, currentStyles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSubtitle}>Account & session settings</Text>
      </View>

      {/* Avatar + Name Card */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatarCircle, { borderColor: isDarkMode ? "#1E293B" : "#fff" }]}>
          <Text style={styles.avatarInitial}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={[styles.userName, currentStyles.textMain]}>{user?.name || "User"}</Text>
        <View style={[styles.roleBadge, { backgroundColor: isDarkMode ? "#0C4A6E" : "#F0FDFA", borderColor: isDarkMode ? "#0369A1" : "#99F6E4" }]}>
          <Ionicons name="shield-checkmark" size={12} color={isDarkMode ? "#38BDF8" : "#0D9488"} style={{ marginRight: 4 }} />
          <Text style={[styles.roleBadgeText, { color: isDarkMode ? "#38BDF8" : "#0D9488" }]}>
            {ROLE_LABELS[user?.role || ""] || user?.role || "Unknown"}
          </Text>
        </View>
      </View>

      {/* Info & Settings Cards */}
      <View style={styles.infoSection}>
        <View style={[styles.infoCard, currentStyles.card]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDarkMode ? "#0F766E" : "#F0FDFA" }]}>
              <Ionicons name="person-outline" size={18} color={isDarkMode ? "#2DD4BF" : "#0D9488"} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, currentStyles.textSub]}>Full Name</Text>
              <Text style={[styles.infoValue, currentStyles.textMain]}>{user?.name || "—"}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDarkMode ? "#1E3A8A" : "#EFF6FF" }]}>
              <Ionicons name="mail-outline" size={18} color={isDarkMode ? "#60A5FA" : "#3B82F6"} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, currentStyles.textSub]}>Email Address</Text>
              <Text style={[styles.infoValue, currentStyles.textMain]}>{user?.email || "—"}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDarkMode ? "#581C87" : "#FDF4FF" }]}>
              <Ionicons name="briefcase-outline" size={18} color={isDarkMode ? "#C084FC" : "#A855F7"} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, currentStyles.textSub]}>Role</Text>
              <Text style={[styles.infoValue, currentStyles.textMain]}>
                {ROLE_LABELS[user?.role || ""] || user?.role || "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]} />

          {/* 3. Theme Display Row Configuration */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDarkMode ? "#334155" : "#FEF3C7" }]}>
              <Ionicons 
                name={isDarkMode ? "moon-outline" : "sunny-outline"} 
                size={18} 
                color={isDarkMode ? "#F1F5F9" : "#D97706"} 
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, currentStyles.textSub]}>Appearance</Text>
              <Text style={[styles.infoValue, currentStyles.textMain]}>
                {isDarkMode ? "Dark Mode" : "Light Mode"}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              trackColor={{ false: "#CBD5E1", true: "#0D9488" }}
              thumbColor={Platform.OS === "android" ? "#F8FAFC" : undefined}
            />
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <Pressable 
          style={[
            styles.logoutBtn, 
            { 
              backgroundColor: isDarkMode ? "#451A03" : "#FEF2F2", 
              borderColor: isDarkMode ? "#78350F" : "#FECACA" 
            }
          ]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <Text style={[styles.versionText, { color: isDarkMode ? "#475569" : "#CBD5E1" }]}>MediGo v1.0.0</Text>
    </View>
  );
}

// Global immutable structure definitions
const lightStyles = StyleSheet.create({
  container: { backgroundColor: "#F8FAFC" },
  card: { backgroundColor: "#fff", borderColor: "#E2E8F0" },
  textMain: { color: "#1E293B" },
  textSub: { color: "#94A3B8" },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: "#0F172A" },
  card: { backgroundColor: "#1E293B", borderColor: "#334155" },
  textMain: { color: "#F8FAFC" },
  textSub: { color: "#64748B" },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: "#0D9488",
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#CCFBF1",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: -32,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  infoCard: {
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
  },
  logoutSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 24,
  },
});