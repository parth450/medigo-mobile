import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { getUsersApi, createUserApi } from "../../api/users.api";
import type { User } from "../../types/auth.types";
import { triggerLogout } from "../../api/axiosClient";

export default function StaffManagementScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddStaffVisible, setIsAddStaffVisible] = useState(false);

  // Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"pharmacist" | "store_manager">("pharmacist");

  // Fetch employees list
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsersApi,
  });

  const filteredUsers = users.filter(
    (u) =>
      (u.username || u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // Register Employee Mutation
  const registerMutation = useMutation({
    mutationFn: createUserApi,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsAddStaffVisible(false);
      Alert.alert("Success", "New employee registered successfully. They can now log in.");
      // Reset Form
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("pharmacist");
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Registration Error", error?.response?.data?.message || "Failed to register staff.");
    },
  });

  const handleRegisterStaff = () => {
    if (!username || !email || !password) {
      Alert.alert("Required Fields", "Please complete name, email, and credentials.");
      return;
    }

    registerMutation.mutate({
      username,
      email,
      password_hash: password,
      role,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <View>
            <Text style={styles.brandTitle}>Staff Management</Text>
            <Text style={styles.brandSubtitle}>Manage pharmacy employee accounts</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              style={styles.addStaffBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAddStaffVisible(true);
              }}
            >
              <Text style={styles.addStaffBtnText}>+ Staff</Text>
            </Pressable>
            <Pressable
              style={styles.logoutHeaderBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(
                  "Logout Confirm",
                  "Are you sure you want to sign out?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Logout", style: "destructive", onPress: () => triggerLogout() }
                  ]
                );
              }}
            >
              <Text style={styles.logoutHeaderBtnText}>Logout</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Name or Email address..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyHeading}>No Staff Accounts</Text>
          <Text style={styles.emptySub}>No employees match your search query.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userMeta}>
                <Text style={styles.userName}>{item.username || item.name || "N/A"}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
              
              <View style={styles.badgeColumn}>
                <View
                  style={[
                    styles.roleBadge,
                    item.role === "store_manager" ? styles.managerBadge : styles.pharmacistBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      item.role === "store_manager" ? styles.managerText : styles.pharmacistText,
                    ]}
                  >
                    {item.role === "store_manager" ? "MANAGER" : "PHARMACIST"}
                  </Text>
                </View>
                <View style={styles.activeStatusBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeLabel}>ACTIVE</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal: Register Employee Account */}
      <Modal visible={isAddStaffVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Employee</Text>
              <Pressable onPress={() => setIsAddStaffVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
              <Text style={styles.formLabel}>Full Username *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. johndoe" value={username} onChangeText={setUsername} />

              <Text style={styles.formLabel}>Corporate Email Address *</Text>
              <TextInput style={styles.formInput} keyboardType="email-address" placeholder="e.g. john@medigo.com" value={email} onChangeText={setEmail} />

              <Text style={styles.formLabel}>Login Password *</Text>
              <TextInput style={styles.formInput} secureTextEntry={true} placeholder="••••••••" value={password} onChangeText={setPassword} />

              <Text style={styles.formLabel}>Role Assignment</Text>
              <View style={styles.roleSelectionRow}>
                <Pressable
                  style={[
                    styles.roleOptionCard,
                    role === "pharmacist" && styles.roleOptionCardSelected,
                  ]}
                  onPress={() => setRole("pharmacist")}
                >
                  <Text style={styles.roleIcon}>⚕️</Text>
                  <Text style={[styles.roleOptionTitle, role === "pharmacist" && styles.roleOptionTitleSelected]}>
                    Pharmacist
                  </Text>
                  <Text style={styles.roleOptionSub}>Point of Sale & Billing</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.roleOptionCard,
                    role === "store_manager" && styles.roleOptionCardSelected,
                  ]}
                  onPress={() => setRole("store_manager")}
                >
                  <Text style={styles.roleIcon}>🔑</Text>
                  <Text style={[styles.roleOptionTitle, role === "store_manager" && styles.roleOptionTitleSelected]}>
                    Store Manager
                  </Text>
                  <Text style={styles.roleOptionSub}>Inventory & Reports</Text>
                </Pressable>
              </View>

              {registerMutation.isPending ? (
                <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 20 }} />
              ) : (
                <Pressable style={styles.submitBtn} onPress={handleRegisterStaff}>
                  <Text style={styles.submitBtnText}>Create Employee Account</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#0D9488",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  brandSubtitle: {
    color: "#CCFBF1",
    fontSize: 12,
    fontWeight: "500",
  },
  addStaffBtn: {
    backgroundColor: "#0F766E",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  logoutHeaderBtn: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 8,
  },
  logoutHeaderBtnText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 14,
  },
  addStaffBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  searchSection: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1E293B",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: "#94A3B8",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#475569",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  userMeta: {
    flex: 1.5,
  },
  userName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  userEmail: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  badgeColumn: {
    alignItems: "flex-end",
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  pharmacistBadge: {
    backgroundColor: "#F3E8FF",
  },
  pharmacistText: {
    color: "#6B21A8",
  },
  managerBadge: {
    backgroundColor: "#D1FAE5",
  },
  managerText: {
    color: "#065F46",
  },
  roleText: {
    fontSize: 9,
    fontWeight: "800",
  },
  activeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10B981",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  closeBtnText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 15,
  },
  formContainer: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1E293B",
    marginBottom: 6,
  },
  roleSelectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  roleOptionCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
  },
  roleOptionCardSelected: {
    backgroundColor: "#F0FDFA",
    borderColor: "#0D9488",
    borderWidth: 2,
  },
  roleIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  roleOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  roleOptionTitleSelected: {
    color: "#0D9488",
  },
  roleOptionSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: "#0D9488",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
