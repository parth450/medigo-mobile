import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getUsersApi } from "../../api/users.api";
import { useTheme } from "../../store/theme.store";

export default function StaffManagementScreen() {
  const [search, setSearch] = useState("");

  // Hook into theme store specifically tracking isDarkMode to force re-renders
  const isDarkMode = useTheme((state) => state.isDarkMode);

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

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={[styles.container, currentStyles.container]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D9488" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <View>
            <Text style={styles.brandTitle}>Staff Management</Text>
            <Text style={styles.brandSubtitle}>Manage pharmacy employee accounts</Text>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={[styles.searchInput, currentStyles.input]}
          placeholder="Search by Name or Email address..."
          placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
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
          <Text style={[styles.emptyHeading, currentStyles.textSub]}>No Staff Accounts</Text>
          <Text style={[styles.emptySub, { color: isDarkMode ? "#475569" : "#94A3B8" }]}>
            No employees match your search query.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={[styles.userCard, currentStyles.card]}>
              <View style={styles.userMeta}>
                <Text style={[styles.userName, currentStyles.textMain]}>
                  {item.username || item.name || "N/A"}
                </Text>
                <Text style={[styles.userEmail, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                  {item.email}
                </Text>
              </View>
              
              <View style={styles.badgeColumn}>
                <View
                  style={[
                    styles.roleBadge,
                    item.role === "store_manager" 
                      ? (isDarkMode ? darkStyles.managerBadge : lightStyles.managerBadge) 
                      : (isDarkMode ? darkStyles.pharmacistBadge : lightStyles.pharmacistBadge),
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
    </View>
  );
}

const lightStyles = StyleSheet.create({
  container: { backgroundColor: "#F8FAFC" },
  input: { backgroundColor: "#fff", borderColor: "#E2E8F0", color: "#1E293B" },
  card: { backgroundColor: "#fff", borderColor: "#F1F5F9" },
  textMain: { color: "#0F172A" },
  textSub: { color: "#475569" },
  pharmacistBadge: { backgroundColor: "#F3E8FF" },
  managerBadge: { backgroundColor: "#DCFCE7" },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: "#0F172A" },
  input: { backgroundColor: "#1E293B", borderColor: "#334155", color: "#F8FAFC" },
  card: { backgroundColor: "#1E293B", borderColor: "#334155" },
  textMain: { color: "#F8FAFC" },
  textSub: { color: "#94A3B8" },
  pharmacistBadge: { backgroundColor: "#3B0764" }, 
  managerBadge: { backgroundColor: "#052E16" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: "#0D9488", paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brandTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  brandSubtitle: { color: "#CCFBF1", fontSize: 12, fontWeight: "500" },
  searchSection: { padding: 16 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyHeading: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptySub: { fontSize: 13 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  userCard: { borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1 },
  userMeta: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700" },
  userEmail: { fontSize: 13, marginTop: 2 },
  badgeColumn: { alignItems: "flex-end" },
  roleBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginBottom: 6 },
  roleText: { fontSize: 10, fontWeight: "800" },
  pharmacistText: { color: "#A855F7" },
  managerText: { color: "#22C55E" },
  activeStatusBadge: { flexDirection: "row", alignItems: "center" },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981", marginRight: 4 },
  activeLabel: { fontSize: 10, fontWeight: "700", color: "#10B981" },
});