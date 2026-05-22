import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getMedicineBatchesApi, getMedicinesApi } from "../../api/medicines.api";
import type { Medicine } from "../../types/api.types";
import { useTheme } from "../../store/theme.store";

const CATEGORIES = ["all", "tablet", "capsule", "syrup", "injection", "cream", "drops"] as const;

export default function MedicineCatalogScreen() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedMedicineId, setExpandedMedicineId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Extract theme properties
  const { isDarkMode } = useTheme();

  const {
    data: infiniteMedicinesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["medicines", search, selectedCategory],
    queryFn: ({ pageParam = 1 }) =>
      getMedicinesApi({
        search,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        status: "active",
        page: pageParam,
        limit: 10,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length + 1 : undefined;
    },
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleToggleExpand = (medicineId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (expandedMedicineId === medicineId) {
      setExpandedMedicineId(null);
    } else {
      setExpandedMedicineId(medicineId);
    }
  };

  const medicinesList: Medicine[] = infiniteMedicinesData
    ? infiniteMedicinesData.pages.flat()
    : [];

  // 2. Select contextual style map
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={[styles.container, currentStyles.container]}>
      {/* Header Layout */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Medicine Catalog</Text>
          <Text style={styles.brandSubtitle}>Real-time stock & locator logs</Text>
        </View>
      </View>

      {/* Filter Options Rack Section */}
      <View style={[styles.searchFilterSection, currentStyles.filterSection]}>
        <TextInput
          style={[styles.searchInput, currentStyles.input]}
          placeholder="Filter by chemical name, manufacturer..."
          placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
          value={search}
          onChangeText={setSearch}
        />

        {/* Horizontal Category Select Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryBadge,
                  isDarkMode ? darkStyles.categoryBadge : lightStyles.categoryBadge,
                  isActive && styles.categoryBadgeActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat);
                }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isDarkMode ? darkStyles.textSub : lightStyles.textSub,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {cat.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : medicinesList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyHeading, currentStyles.textSub]}>No Medicines Found</Text>
          <Text style={[styles.emptySub, { color: isDarkMode ? "#475569" : "#94A3B8" }]}>No results match your lookup query.</Text>
        </View>
      ) : (
        <FlatList
          data={medicinesList}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDarkMode ? "#34D399" : "#0D9488"}
              colors={["#0D9488"]}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color="#0D9488" style={{ marginVertical: 12 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.medCard, currentStyles.card]}
              onPress={() => handleToggleExpand(item.id)}
            >
              <View style={styles.medHeaderRow}>
                <View style={styles.medInfo}>
                  {/* Fixed: Moved fallback check inside the text rendering space */}
                  <Text style={[styles.medName, currentStyles.textMain]}>
                    {item.name ?? "Unnamed Medicine"}
                  </Text>
                  {item.generic_name && (
                    <Text style={[styles.genericName, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>{item.generic_name}</Text>
                  )}
                  <View style={styles.metaBadgeGrid}>
                    <View style={[styles.metaBadge, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
                      <Text style={[styles.metaBadgeText, currentStyles.textSub]}>{item.category}</Text>
                    </View>
                    <View style={[styles.metaBadge, styles.locationBadge, { backgroundColor: isDarkMode ? "#064E3B" : "#F0FDFA" }]}>
                      <Text style={[styles.locationBadgeText, { color: isDarkMode ? "#34D399" : "#0D9488" }]}>Rack: {item.rack_location}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.priceAction}>
                  <Text style={styles.medCode}>#{item.medicine_code}</Text>
                  <Text style={[styles.expandLabel, { color: isDarkMode ? "#34D399" : "#0D9488" }]}>
                    {expandedMedicineId === item.id ? "Hide Batches ▲" : "View Batches ▼"}
                  </Text>
                </View>
              </View>

              {/* Lazy Loaded Batches Content Block */}
              {expandedMedicineId === item.id && (
                <MedicineBatchesSection medicineId={item.id} isDarkMode={isDarkMode} currentStyles={currentStyles} />
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

interface BatchSectionProps {
  medicineId: number;
  isDarkMode: boolean;
  currentStyles: any;
}

function MedicineBatchesSection({ medicineId, isDarkMode, currentStyles }: BatchSectionProps) {
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
        <Text style={[styles.batchEmptyText, { color: isDarkMode ? "#64748B" : "#94A3B8" }]}>No active batches found in inventory.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.batchSection, { borderTopColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
      <Text style={[styles.batchSectionTitle, currentStyles.textSub]}>Inventory Batch Breakdown</Text>
      {batches.map((batch) => {
        const daysToExpiry = getExpiryDays(batch.expiry_date);
        let expiryColor = isDarkMode ? "#34D399" : "#10B981";
        let expiryLabel = `Exp: ${new Date(batch.expiry_date).toLocaleDateString()}`;

        if (daysToExpiry <= 0) {
          expiryColor = "#EF4444";
          expiryLabel = "Expired";
        } else if (daysToExpiry <= 90) {
          expiryColor = "#F59E0B";
          expiryLabel = `Expiring soon (${daysToExpiry} days)`;
        }

        return (
          <View key={batch.mb_id} style={[styles.batchRow, currentStyles.batchRow]}>
            <View style={styles.batchRowInfo}>
              <Text style={[styles.batchNumberText, currentStyles.textMain]}>Batch {batch.batch_number}</Text>
              <Text style={[styles.batchExpiryText, { color: expiryColor }]}>
                {expiryLabel}
              </Text>
            </View>
            <View style={styles.batchRowPriceStock}>
              <Text style={[styles.batchMrpText, currentStyles.textMain]}>₹{Number(batch.mrp).toFixed(2)}</Text>
              <Text
                style={[
                  styles.batchQtyText,
                  batch.quantity <= 10 ? styles.qtyLowText : (isDarkMode ? { color: "#34D399" } : styles.qtyOkText),
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

// 3. Structured Light & Dark Styling Maps
const lightStyles = StyleSheet.create({
  container: { backgroundColor: "#F8FAFC" },
  filterSection: { backgroundColor: "#fff", borderBottomColor: "#F1F5F9" },
  input: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#1E293B" },
  categoryBadge: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  card: { backgroundColor: "#fff", borderColor: "#F1F5F9" },
  batchRow: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  textMain: { color: "#0F172A" },
  textSub: { color: "#475569" },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: "#0F172A" },
  filterSection: { backgroundColor: "#1E293B", borderBottomColor: "#334155" },
  input: { backgroundColor: "#0F172A", borderColor: "#334155", color: "#F8FAFC" },
  categoryBadge: { backgroundColor: "#334155", borderColor: "#475569" },
  card: { backgroundColor: "#1E293B", borderColor: "#334155" },
  batchRow: { backgroundColor: "#0F172A", borderColor: "#334155" },
  textMain: { color: "#F8FAFC" },
  textSub: { color: "#94A3B8" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: "#0D9488", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brandTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  brandSubtitle: { color: "#CCFBF1", fontSize: 12, fontWeight: "500" },
  searchFilterSection: { padding: 16, borderBottomWidth: 1 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15, marginBottom: 12 },
  categoryContainer: { paddingVertical: 4 },
  categoryBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, marginRight: 8, borderWidth: 1 },
  categoryBadgeActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  categoryText: { fontSize: 11, fontWeight: "700" },
  categoryTextActive: { color: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyHeading: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptySub: { fontSize: 13 },
  listContainer: { padding: 16 },
  medCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: "#475569", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  medHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  medInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: "700" },
  genericName: { fontSize: 12, marginTop: 2, fontStyle: "italic" },
  metaBadgeGrid: { flexDirection: "row", marginTop: 8 },
  metaBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginRight: 6 },
  metaBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  locationBadge: {},
  locationBadgeText: { fontSize: 10, fontWeight: "700" },
  priceAction: { alignItems: "flex-end" },
  medCode: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  expandLabel: { fontSize: 11, fontWeight: "700", marginTop: 16 },
  batchLoading: { padding: 16, alignItems: "center" },
  batchEmpty: { padding: 16, alignItems: "center" },
  batchEmptyText: { fontSize: 12 },
  batchSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  batchSectionTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 10 },
  batchRow: { borderRadius: 10, padding: 10, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  batchRowInfo: { flex: 1.5 },
  batchNumberText: { fontSize: 13, fontWeight: "700" },
  batchExpiryText: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  batchRowPriceStock: { alignItems: "flex-end" },
  batchMrpText: { fontSize: 14, fontWeight: "700" },
  batchQtyText: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  qtyOkText: { color: "#10B981" },
  qtyLowText: { color: "#EF4444" },
});