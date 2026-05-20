import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { getMedicinesApi, getMedicineBatchesApi } from "../../api/medicines.api";
import type { Medicine } from "../../types/api.types";
import { triggerLogout } from "../../api/axiosClient";

const CATEGORIES = ["all", "tablet", "capsule", "syrup", "injection", "cream", "drops"] as const;

export default function MedicineCatalogScreen() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedMedicineId, setExpandedMedicineId] = useState<number | null>(null);

  // Fetch medicines catalog using query variables
  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ["medicines", search, selectedCategory],
    queryFn: () =>
      getMedicinesApi({
        search,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        status: "active",
      }),
  });

  const handleToggleExpand = (medicineId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (expandedMedicineId === medicineId) {
      setExpandedMedicineId(null);
    } else {
      setExpandedMedicineId(medicineId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Medicine Catalog</Text>
          <Text style={styles.brandSubtitle}>Real-time stock & locator logs</Text>
        </View>
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

      {/* Filter Section */}
      <View style={styles.searchFilterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by chemical name, manufacturer..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        
        {/* Category Badge Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.categoryBadge,
                selectedCategory === cat && styles.categoryBadgeActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(cat);
              }}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : medicines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyHeading}>No Medicines Found</Text>
          <Text style={styles.emptySub}>No results match your lookup query.</Text>
        </View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <Pressable
              style={styles.medCard}
              onPress={() => handleToggleExpand(item.id)}
            >
              <View style={styles.medHeaderRow}>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{item.name}</Text>
                  {item.generic_name && (
                    <Text style={styles.genericName}>{item.generic_name}</Text>
                  )}
                  <View style={styles.metaBadgeGrid}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>{item.category}</Text>
                    </View>
                    <View style={[styles.metaBadge, styles.locationBadge]}>
                      <Text style={styles.locationBadgeText}>Rack: {item.rack_location}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.priceAction}>
                  <Text style={styles.medCode}>#{item.medicine_code}</Text>
                  <Text style={styles.expandLabel}>
                    {expandedMedicineId === item.id ? "Hide Batches ▲" : "View Batches ▼"}
                  </Text>
                </View>
              </View>

              {/* Batches Expanded Section */}
              {expandedMedicineId === item.id && (
                <MedicineBatchesSection medicineId={item.id} />
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

// Subcomponent to fetch and render batches dynamically under each medicine card
function MedicineBatchesSection({ medicineId }: { medicineId: number }) {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["batches", medicineId],
    queryFn: () => getMedicineBatchesApi(medicineId),
  });

  const getExpiryDays = (dateString: string) => {
    const expDate = new Date(dateString);
    const today = new Date();
    const diff = expDate.getTime() - today.getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  if (isLoading) {
    return (
      <View style={styles.batchLoading}>
        <ActivityIndicator size="small" color="#0D9488" />
      </View>
    );
  }

  if (batches.length === 0) {
    return (
      <View style={styles.batchEmpty}>
        <Text style={styles.batchEmptyText}>No active batches found in inventory.</Text>
      </View>
    );
  }

  return (
    <View style={styles.batchSection}>
      <Text style={styles.batchSectionTitle}>Inventory Batch Breakdown</Text>
      {batches.map((batch) => {
        const daysToExpiry = getExpiryDays(batch.expiry_date);
        let expiryColor = "#10B981"; // Safe green
        let expiryLabel = `Exp: ${new Date(batch.expiry_date).toLocaleDateString()}`;

        if (daysToExpiry <= 0) {
          expiryColor = "#EF4444"; // Expired red
          expiryLabel = "Expired";
        } else if (daysToExpiry <= 90) {
          expiryColor = "#F59E0B"; // Expiring soon amber
          expiryLabel = `Expiring soon (${daysToExpiry} days)`;
        }

        return (
          <View key={batch.mb_id} style={styles.batchRow}>
            <View style={styles.batchRowInfo}>
              <Text style={styles.batchNumberText}>Batch {batch.batch_number}</Text>
              <Text style={[styles.batchExpiryText, { color: expiryColor }]}>
                {expiryLabel}
              </Text>
            </View>
            <View style={styles.batchRowPriceStock}>
              <Text style={styles.batchMrpText}>₹{Number(batch.mrp).toFixed(2)}</Text>
              <Text
                style={[
                  styles.batchQtyText,
                  batch.quantity <= 10 ? styles.qtyLowText : styles.qtyOkText,
                ]}
              >
                Stock: {batch.quantity} units
              </Text>
            </View>
          </View>
        );
      })}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logoutHeaderBtn: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  logoutHeaderBtnText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 14,
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
  searchFilterSection: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1E293B",
    marginBottom: 12,
  },
  categoryContainer: {
    paddingVertical: 4,
  },
  categoryBadge: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryBadgeActive: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  categoryTextActive: {
    color: "#fff",
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
    padding: 16,
  },
  medCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#475569",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  medHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  genericName: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontStyle: "italic",
  },
  metaBadgeGrid: {
    flexDirection: "row",
    marginTop: 8,
  },
  metaBadge: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  locationBadge: {
    backgroundColor: "#F0FDFA",
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D9488",
  },
  priceAction: {
    alignItems: "flex-end",
  },
  medCode: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  expandLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D9488",
    marginTop: 16,
  },
  batchLoading: {
    padding: 16,
    alignItems: "center",
  },
  batchEmpty: {
    padding: 16,
    alignItems: "center",
  },
  batchEmptyText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  batchSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  batchSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  batchRow: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batchRowInfo: {
    flex: 1.5,
  },
  batchNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  batchExpiryText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  batchRowPriceStock: {
    alignItems: "flex-end",
  },
  batchMrpText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  batchQtyText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  qtyOkText: {
    color: "#10B981",
  },
  qtyLowText: {
    color: "#EF4444",
  },
});
