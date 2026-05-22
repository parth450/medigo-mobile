import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getMedicineBatchesApi, getMedicinesApi } from "../../api/medicines.api";
import { useCart } from "../../store/cart.store";
import { useTheme } from "../../store/theme.store";
import type { Medicine, MedicineBatch } from "../../types/api.types";

type PharmacistTabParamList = {
  BillingDesk: undefined;
  Medicines: undefined;
  Invoices: undefined;
};

type MainStackParamList = {
  Pharmacist: undefined;
  ActiveBill: undefined;
  Manager: undefined;
};

type BillingDeskScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<PharmacistTabParamList, "BillingDesk">,
  NativeStackNavigationProp<MainStackParamList>
>;

export default function BillingDeskScreen() {
  const navigation = useNavigation<BillingDeskScreenNavigationProp>();
  const { isDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const {
    items,
    addToCart,
    searchQuery,
    setSearchQuery,
    selectedMedicine,
    setSelectedMedicine,
    isCheckoutSuccess,
    setIsCheckoutSuccess,
    successBillData,
    searchHistory,
    appendToSearchHistory,
  } = useCart();

  const {
    data: infiniteMedicinesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isMedicinesLoading,
    refetch: refetchMedicines,
  } = useInfiniteQuery({
    queryKey: ["medicines", searchQuery],
    queryFn: ({ pageParam = 1 }) =>
      getMedicinesApi({ search: searchQuery, page: pageParam, limit: 10, status: "active" }),
    initialPageParam: 1,
    enabled: searchQuery.trim().length > 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && Array.isArray(lastPage) && lastPage.length === 10 ? allPages.length + 1 : undefined;
    },
  });

  const { data: batches = [], isLoading: isBatchesLoading, refetch: refetchBatches } = useQuery({
    queryKey: ["batches", selectedMedicine?.id],
    queryFn: () => getMedicineBatchesApi(selectedMedicine!.id),
    enabled: !!selectedMedicine,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (selectedMedicine) {
      await refetchBatches();
    } else if (searchQuery.trim().length > 0) {
      await refetchMedicines();
    }
    setRefreshing(false);
  }, [selectedMedicine, searchQuery, refetchBatches, refetchMedicines]);

  const medicinesList: Medicine[] = infiniteMedicinesData?.pages
    ? infiniteMedicinesData.pages.flat()
    : [];

  const handleAddToInvoice = (batch: MedicineBatch) => {
    if (!selectedMedicine) return;

    const existingInCart = items.find((item) => item.batch.mb_id === batch.mb_id);
    const currentQtyInCart = existingInCart ? existingInCart.quantity : 0;

    if (currentQtyInCart >= batch.quantity) {
      alert(`Cannot exceed physical stock constraint (${batch.quantity} units).`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToCart(selectedMedicine, batch, 1);
  };

  const isBatchExpiringSoon = (dateString: string) => {
    const expDate = new Date(dateString);
    const today = new Date();
    const diff = expDate.getTime() - today.getTime();
    return diff / (1000 * 3600 * 24) <= 90;
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={[styles.container, currentStyles.container]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Billing Desk</Text>
          <Text style={styles.brandSubtitle}>Dispensing & Invoicing Platform</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.cartButton} onPress={() => navigation.navigate("ActiveBill")}>
            <Text style={styles.cartBtnText}>Active Bill ({items?.length || 0})</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={selectedMedicine && searchQuery.trim().length > 0 ? batches : []}
        keyExtractor={(item) => item.mb_id.toString()}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? "#34D399" : "#0D9488"}
            colors={["#0D9488"]}
          />
        }
        ListEmptyComponent={
          selectedMedicine && !isBatchesLoading ? (
            <View style={[styles.emptyBatchesContainer, isDarkMode && { backgroundColor: "#2D2206", borderColor: "#78350F" }]}>
              <Text style={[styles.emptyBatchesText, isDarkMode && { color: "#FBBF24" }]}>No active batches found in inventory for this medicine.</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={[styles.card, currentStyles.card]}>
            <Text style={[styles.cardHeading, currentStyles.textMain]}> Search Medicines </Text>
            <TextInput
              style={[styles.searchInput, currentStyles.input, currentStyles.textMain]}
              placeholder="Search by Brand or Generic Composition..."
              placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.trim() === "") {
                  setSelectedMedicine(null);
                }
              }}
              onSubmitEditing={() => appendToSearchHistory(searchQuery)}
            />

            {searchQuery.trim().length === 0 && searchHistory.length > 0 && (
              <View style={styles.historyWrapper}>
                <Text style={[styles.historyLabel, currentStyles.textSub]}>Recent Medicines:</Text>
                <View style={styles.historyChipsContainer}>
                  {searchHistory.map((term, index) => (
                    <Pressable
                      key={index}
                      style={[styles.historyChip, currentStyles.input]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedMedicine(null);
                        setSearchQuery(term);
                      }}
                    >
                      <Ionicons name="time-outline" size={14} color="#047857" style={{ marginRight: 4 }} />
                      <Text style={[styles.historyChipText, currentStyles.textMain]} numberOfLines={1} ellipsizeMode="tail">{term}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {isMedicinesLoading && <ActivityIndicator size="small" color="#0D9488" style={{ marginTop: 10 }} />}

            {searchQuery.trim().length > 0 && medicinesList.length === 0 && !isMedicinesLoading && (
              <Text style={[styles.emptySearch, currentStyles.textSub]}>No matching active stock items found.</Text>
            )}

            {!selectedMedicine && searchQuery.trim().length > 0 && medicinesList.map((item: Medicine) => (
              <Pressable
                key={item.id}
                style={[styles.medSearchItem, currentStyles.container, { borderColor: isDarkMode ? "#334155" : "#E2E8F0" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  appendToSearchHistory(item.name);
                  setSelectedMedicine(item);
                }}
              >
                <View style={styles.medMeta}>
                  <Text style={[styles.medName, currentStyles.textMain]}>{item.name}</Text>
                  {item.generic_name && <Text style={[styles.genericName, currentStyles.textSub]}>{item.generic_name}</Text>}
                </View>
                <View style={[styles.medLocationBadge, { backgroundColor: isDarkMode ? "#334155" : "#E2E8F0" }]}>
                  <Text style={[styles.locationText, currentStyles.textMain]}>{item.rack_location}</Text>
                </View>
              </Pressable>
            ))}

            {selectedMedicine && (
              <View style={[styles.selectedProductCard, isDarkMode && { backgroundColor: "#062E2A", borderColor: "#0F766E" }]}>
                <View style={styles.selectedProductHeader}>
                  <Text style={[styles.selectedProductLabel, isDarkMode && { color: "#2DD4BF" }]}>Selected Product</Text>
                  <Pressable style={styles.changeProductBtn} onPress={() => setSelectedMedicine(null)}>
                    <Text style={styles.changeProductBtnText}>Change Product</Text>
                  </Pressable>
                </View>

                <Text style={[styles.selectedProductName, currentStyles.textMain]}>{selectedMedicine.name}</Text>
                {selectedMedicine.generic_name && (
                  <Text style={[styles.selectedProductGeneric, currentStyles.textSub]}>{selectedMedicine.generic_name}</Text>
                )}

                <View style={styles.selectedProductMetaGrid}>
                  <View style={styles.selectedProductMetaItem}>
                    <Text style={styles.metaItemLabel}>Manufacturer</Text>
                    <Text style={[styles.metaItemValue, currentStyles.textMain]}>{selectedMedicine.manufacturer}</Text>
                  </View>
                  <View style={styles.selectedProductMetaItem}>
                    <Text style={styles.metaItemLabel}>Rack Location</Text>
                    <Text style={[styles.metaItemValue, styles.metaItemLocation]}>{selectedMedicine.rack_location}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        }

        renderItem={({ item: batch }) => {
          if (!selectedMedicine) return null;
          const expiring = isBatchExpiringSoon(batch.expiry_date);
          const cartMatch = items.find((i) => i.batch.mb_id === batch.mb_id);
          const remainingStock = batch.quantity - (cartMatch?.quantity || 0);
          const isOutOfStock = remainingStock <= 0;

          return (
            <View style={[styles.batchCard, currentStyles.card]}>
              <View style={styles.batchInfo}>
                <View style={styles.rowCentered}>
                  <Text style={[styles.batchNumber, currentStyles.textMain]}>Batch {batch.batch_number}</Text>
                  {expiring && (
                    <View style={styles.expiryWarningBadge}>
                      <Text style={styles.warningBadgeText}>Expiring Soon</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.batchExpiry, currentStyles.textSub]}>
                  Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                </Text>
                <Text style={styles.batchPrice}>
                  MRP: ₹{Number(batch?.mrp || 0).toFixed(2)}{" "}
                  <Text style={{ fontSize: 11, color: isDarkMode ? "#94A3B8" : "#64748B", fontWeight: "400" }}>
                    (Incl. {selectedMedicine.gst_percentage || 18}%)
                  </Text>
                </Text>
              </View>

              <View style={styles.batchStockActions}>
                <Text style={[styles.batchStockQty, isOutOfStock ? styles.outOfStockText : styles.inStockText]}>
                  {isOutOfStock ? "No Stock Left" : `${remainingStock} available`}
                </Text>
                <Pressable
                  style={[styles.addBatchBtn, isOutOfStock && styles.disabledBtn]}
                  disabled={isOutOfStock}
                  onPress={() => handleAddToInvoice(batch)}
                >
                  <Text style={styles.addBatchBtnText}>+ Add</Text>
                </Pressable>
              </View>
            </View>
          );
        }}

        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage && !selectedMedicine) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          (isFetchingNextPage || isBatchesLoading) ? (
            <ActivityIndicator size="small" color="#0D9488" style={{ marginVertical: 15 }} />
          ) : null
        }
      />

      {/* Verification Receipt Dialog Modal */}
      <Modal visible={isCheckoutSuccess} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptContainer, currentStyles.card]}>
            <View style={styles.receiptHeader}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={[styles.receiptTitle, currentStyles.textMain]}>Invoice Settled Successfully</Text>
            </View>

            {successBillData && (
              <View style={[styles.receiptBody, currentStyles.container, { borderColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Invoice ID:</Text><Text style={[styles.receiptVal, currentStyles.textMain]}>{successBillData.bill_number || successBillData.id}</Text></View>
                <View style={[styles.dottedDivider, { borderColor: isDarkMode ? "#475569" : "#CBD5E1" }]} />
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Taxable Subtotal:</Text><Text style={[styles.receiptVal, currentStyles.textMain]}>₹{Number(successBillData?.subtotal || 0).toFixed(2)}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>GST Extracted:</Text><Text style={[styles.receiptVal, currentStyles.textMain]}>₹{Number(successBillData?.total_gst || 0).toFixed(2)}</Text></View>
                <View style={[styles.dottedDivider, { borderColor: isDarkMode ? "#475569" : "#CBD5E1" }]} />
                <View style={styles.receiptRow}><Text style={[styles.grandReceiptLabel, currentStyles.textMain]}>Total Paid:</Text><Text style={styles.grandReceiptVal}>₹{Number(successBillData?.grand_total || 0).toFixed(2)}</Text></View>
              </View>
            )}

            <Pressable style={styles.closeReceiptBtn} onPress={() => setIsCheckoutSuccess(false)}>
              <Text style={styles.closeReceiptText}>Next Patient Transaction</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const lightStyles = StyleSheet.create({
  container: { backgroundColor: "#F8FAFC" },
  card: { backgroundColor: "#fff", borderColor: "#F1F5F9" },
  input: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  textMain: { color: "#0F172A" },
  textSub: { color: "#475569" },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: "#0F172A" },
  card: { backgroundColor: "#1E293B", borderColor: "#334155" },
  input: { backgroundColor: "#0F172A", borderColor: "#334155" },
  textMain: { color: "#F8FAFC" },
  textSub: { color: "#94A3B8" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: "#0D9488",
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerActions: { flexDirection: "row", alignItems: "center" },
  rowCentered: { flexDirection: "row", alignItems: "center" },
  brandTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  brandSubtitle: { color: "#CCFBF1", fontSize: 12, fontWeight: "500" },
  cartButton: { backgroundColor: "#0F766E", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  cartBtnText: { color: "#fff", fontWeight: "700" },
  selectedProductCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 12 },
  selectedProductHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  selectedProductLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  changeProductBtn: { backgroundColor: "#0D9488", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  changeProductBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  selectedProductName: { fontSize: 18, fontWeight: "800" },
  selectedProductGeneric: { fontSize: 13, marginTop: 2, fontStyle: "italic" },
  selectedProductMetaGrid: { flexDirection: "row", marginTop: 12, gap: 16 },
  selectedProductMetaItem: { flex: 1 },
  metaItemLabel: { fontSize: 10, fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: 2 },
  metaItemValue: { fontSize: 13, fontWeight: "700" },
  metaItemLocation: { color: "#0D9488" },
  emptyBatchesContainer: { padding: 24, alignItems: "center", backgroundColor: "#FFFBEB", borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A", marginHorizontal: 4, marginTop: 8 },
  emptyBatchesText: { fontSize: 14, color: "#B45309", fontWeight: "600", textAlign: "center" },
  scrollContent: { padding: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  cardHeading: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15 },
  historyWrapper: { marginTop: 12, paddingHorizontal: 4 },
  historyLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  historyChipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  historyChip: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", maxWidth: "100%" },
  historyChipText: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  emptySearch: { textAlign: "center", marginVertical: 24, fontSize: 14, width: "100%" },
  medSearchItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  medMeta: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "700" },
  genericName: { fontSize: 12, marginTop: 2, fontStyle: "italic" },
  medLocationBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  locationText: { fontSize: 11, fontWeight: "700" },
  batchCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  batchInfo: { flex: 1 },
  batchNumber: { fontSize: 14, fontWeight: "700" },
  expiryWarningBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  warningBadgeText: { color: "#D97706", fontSize: 10, fontWeight: "700" },
  batchExpiry: { fontSize: 12, marginTop: 2 },
  batchPrice: { fontSize: 14, fontWeight: "700", color: "#0D9488", marginTop: 4 },
  batchStockActions: { alignItems: "flex-end" },
  batchStockQty: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  inStockText: { color: "#10B981" },
  outOfStockText: { color: "#EF4444" },
  addBatchBtn: { backgroundColor: "#0D9488", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  disabledBtn: { backgroundColor: "#CBD5E1" },
  addBatchBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "center", alignItems: "center" },
  receiptContainer: { borderRadius: 24, padding: 24, width: "85%", borderWidth: 1 },
  receiptHeader: { alignItems: "center", marginBottom: 20 },
  successIcon: { fontSize: 32, color: "#10B981", backgroundColor: "#ECFDF5", width: 60, height: 60, borderRadius: 30, textAlign: "center", lineHeight: 60, marginBottom: 12 },
  receiptTitle: { fontSize: 18, fontWeight: "800" },
  receiptBody: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  receiptLabel: { fontSize: 13, color: "#64748B" },
  receiptVal: { fontSize: 13, fontWeight: "600" },
  dottedDivider: { borderStyle: "dashed", borderWidth: 1, marginVertical: 10, height: 0 },
  grandReceiptLabel: { fontSize: 15, fontWeight: "800" },
  grandReceiptVal: { fontSize: 17, fontWeight: "800", color: "#0D9488" },
  closeReceiptBtn: { backgroundColor: "#0F172A", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  closeReceiptText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});