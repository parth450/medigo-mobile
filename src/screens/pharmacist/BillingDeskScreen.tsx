import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { getMedicinesApi, getMedicineBatchesApi } from "../../api/medicines.api";
import { createBillApi } from "../../api/bills.api";
import { useCart } from "../../store/cart.store";
import type { Medicine, MedicineBatch } from "../../types/api.types";
import { triggerLogout } from "../../api/axiosClient";

export default function BillingDeskScreen() {
  const queryClient = useQueryClient();
  const {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    totalGst,
    grandTotal,
  } = useCart();

  const [search, setSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [successBillData, setSuccessBillData] = useState<any>(null);
  const [isCartVisible, setIsCartVisible] = useState(false);

  // 🌟 Optimized Query: Added tracking parameters & cache cleaning properties
  const { data: medicines = [], isLoading: isMedicinesLoading } = useQuery({
    queryKey: ["medicines", search],
    queryFn: () => getMedicinesApi({ search, status: "active" }),
    enabled: search.trim().length > 0, // ⚡ Triggers live requests from the very 1st character typed
    staleTime: 0,                     // ⚡ Disables query staleness lifecycle retention
    gcTime: 0,                        // ⚡ Prevents old full arrays from overriding active matching frames
  });

  const { data: batches = [], isLoading: isBatchesLoading } = useQuery({
    queryKey: ["batches", selectedMedicine?.id],
    queryFn: () => getMedicineBatchesApi(selectedMedicine!.id),
    enabled: !!selectedMedicine,
  });

  const checkoutMutation = useMutation({
    mutationFn: createBillApi,
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessBillData(data);
      setIsCheckoutSuccess(true);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Billing Failure", error?.response?.data?.message || "Verify inventory levels.");
    },
  });

  const handleMedicineSelect = (medicine: Medicine) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMedicine(medicine);
  };

  const handleAddToInvoice = (batch: MedicineBatch) => {
    if (!selectedMedicine) return;

    const existingInCart = items.find((item) => item.batch.mb_id === batch.mb_id);
    const currentQtyInCart = existingInCart ? existingInCart.quantity : 0;

    if (currentQtyInCart >= batch.quantity) {
      Alert.alert("Stock Exhausted", `Cannot exceed available physical stock (${batch.quantity} units).`);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Billing Desk</Text>
          <Text style={styles.brandSubtitle}>Dispensing & Invoicing Platform</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.cartButton} onPress={() => setIsCartVisible(true)}>
            <Text style={styles.cartBtnText}>Active Bill ({items?.length || 0})</Text>
          </Pressable>
          <Pressable style={styles.logoutHeaderBtn} onPress={() => triggerLogout()}>
            <Text style={styles.logoutHeaderBtnText}>Exit</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Medicine Index Lookup Search */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>1. Product Inventory Lookup</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Brand or Generic Composition..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              if (text.trim() === "") {
                setSelectedMedicine(null); 
              }
            }}
          />
          
          {isMedicinesLoading && <ActivityIndicator size="small" color="#0D9488" style={{ marginTop: 10 }} />}

          {search.trim().length > 0 && medicines.length === 0 && !isMedicinesLoading && (
            <Text style={styles.emptySearch}>No matching active stock items found.</Text>
          )}

          {search.trim().length > 0 && medicines.map((item: Medicine) => (
            <Pressable
              key={item.id}
              style={[styles.medSearchItem, selectedMedicine?.id === item.id && styles.medSearchItemSelected]}
              onPress={() => handleMedicineSelect(item)}
            >
              <View style={styles.medMeta}>
                <Text style={styles.medName}>{item.name}</Text>
                {item.generic_name && <Text style={styles.genericName}>{item.generic_name}</Text>}
              </View>
              <View style={styles.medLocationBadge}>
                <Text style={styles.locationText}>{item.rack_location}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Live Batch Array Monitor */}
        {selectedMedicine && search.trim().length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>2. Available Batches: {selectedMedicine.name}</Text>
            {isBatchesLoading ? (
              <ActivityIndicator size="small" color="#0D9488" />
            ) : batches.length === 0 ? (
              <Text style={styles.emptySearch}>No active batches found in inventory shelves.</Text>
            ) : (
              batches.map((batch: MedicineBatch) => {
                const expiring = isBatchExpiringSoon(batch.expiry_date);
                const cartMatch = items.find((i) => i.batch.mb_id === batch.mb_id);
                const remainingStock = batch.quantity - (cartMatch?.quantity || 0);
                const isOutOfStock = remainingStock <= 0;

                return (
                  <View key={batch.mb_id} style={styles.batchCard}>
                    <View style={styles.batchInfo}>
                      <View style={styles.rowCentered}>
                        <Text style={styles.batchNumber}>Batch {batch.batch_number}</Text>
                        {expiring && (
                          <View style={styles.expiryWarningBadge}>
                            <Text style={styles.warningBadgeText}>Expiring Soon</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.batchExpiry}>
                        Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                      </Text>
                      <Text style={styles.batchPrice}>
                        MRP: ₹{Number(batch?.mrp || 0).toFixed(2)}{" "}
                        <Text style={{ fontSize: 11, color: "#64748B", fontWeight: "400" }}>
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
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Cart Sliding Sheet Overlay Modal */}
      <Modal visible={isCartVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.cartSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Active Invoice Items</Text>
              <Pressable onPress={() => setIsCartVisible(false)}>
                <Text style={styles.closeBtnText}>Back to Search</Text>
              </Pressable>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Text style={styles.emptyCartHeading}>Invoice is Empty</Text>
                <Text style={styles.emptyCartSub}>Select medicines above to build current order.</Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.cartList}>
                  {items.map((item) => (
                    <View key={item.batch.mb_id} style={styles.cartItemRow}>
                      <View style={styles.cartItemDetails}>
                        <Text style={styles.cartItemName}>{item.medicine.name}</Text>
                        <Text style={styles.cartItemMeta}>
                          Batch {item.batch.batch_number} • MRP ₹{Number(item.batch?.mrp || 0).toFixed(2)}
                        </Text>
                        <Text style={styles.individualGstText}>
                          GST ({item.medicine.gst_percentage || 18}%): +₹{Number(item?.itemGst || 0).toFixed(2)}
                        </Text>
                      </View>
                      
                      <View style={styles.qtyControl}>
                        <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.batch.mb_id, item.quantity - 1)}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </Pressable>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.batch.mb_id, item.quantity + 1)}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </Pressable>
                      </View>

                      <Pressable style={styles.deleteCartItem} onPress={() => removeFromCart(item.batch.mb_id)}>
                        <Text style={styles.deleteText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.paymentSection}>
                  <Text style={styles.sectionHeading}>Financial Breakdown</Text>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Taxable Subtotal</Text>
                    <Text style={styles.pricingValue}>₹{Number(subtotal || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Total Integrated GST</Text>
                    <Text style={styles.pricingValue}>₹{Number(totalGst || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.pricingRow}>
                    <Text style={styles.grandTotalLabel}>Grand Total (MRP Total)</Text>
                    <Text style={styles.grandTotalValue}>₹{Number(grandTotal || 0).toFixed(2)}</Text>
                  </View>

                  <Text style={styles.sectionHeading}>Payment Framework</Text>
                  <View style={styles.paymentGrid}>
                    {(["cash", "card", "upi"] as const).map((method) => (
                      <Pressable
                        key={method}
                        style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionSelected]}
                        onPress={() => setPaymentMethod(method)}
                      >
                        <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextSelected]}>
                          {method.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    style={styles.checkoutBtn}
                    onPress={() => checkoutMutation.mutate({ payment_method: paymentMethod, items: items.map(i => ({ mb_id: i.batch.mb_id, quantity: i.quantity })) })}
                  >
                    <Text style={styles.checkoutBtnText}>Complete & Generate Bill</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Checkout Receipt Dialog */}
      <Modal visible={isCheckoutSuccess} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptHeader}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.receiptTitle}>Invoice Settled Successfully</Text>
            </View>

            {successBillData && (
              <View style={styles.receiptBody}>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Invoice ID:</Text><Text style={styles.receiptVal}>{successBillData.bill_number}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Route:</Text><Text style={styles.receiptVal}>{paymentMethod.toUpperCase()}</Text></View>
                <View style={styles.dottedDivider} />
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Taxable Subtotal:</Text><Text style={styles.receiptVal}>₹{Number(successBillData?.subtotal || 0).toFixed(2)}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>GST Extracted:</Text><Text style={styles.receiptVal}>₹{Number(successBillData?.total_gst || 0).toFixed(2)}</Text></View>
                <View style={styles.dottedDivider} />
                <View style={styles.receiptRow}><Text style={styles.grandReceiptLabel}>Total Paid:</Text><Text style={styles.grandReceiptVal}>₹{Number(successBillData?.grand_total || 0).toFixed(2)}</Text></View>
              </View>
            )}

            <Pressable style={styles.closeReceiptBtn} onPress={() => { setIsCheckoutSuccess(false); setIsCartVisible(false); }}>
              <Text style={styles.closeReceiptText}>Next Patient Transaction</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { backgroundColor: "#0D9488", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  rowCentered: { flexDirection: "row", alignItems: "center" },
  brandTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  brandSubtitle: { color: "#CCFBF1", fontSize: 12, fontWeight: "500" },
  cartButton: { backgroundColor: "#0F766E", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  logoutHeaderBtn: { backgroundColor: "#FEE2E2", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginLeft: 8 },
  logoutHeaderBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 14 },
  cartBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scrollContent: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#F1F5F9" },
  cardHeading: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  searchInput: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15, color: "#1E293B", marginBottom: 8 },
  emptySearch: { color: "#64748B", textAlign: "center", marginVertical: 12, fontSize: 14 },
  medSearchItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  medSearchItemSelected: { backgroundColor: "#F0FDFA", borderRadius: 8 },
  medMeta: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  genericName: { fontSize: 12, color: "#64748B", marginTop: 2 },
  medLocationBadge: { backgroundColor: "#E2E8F0", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  locationText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  batchCard: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  batchInfo: { flex: 1 },
  batchNumber: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  expiryWarningBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  warningBadgeText: { color: "#D97706", fontSize: 10, fontWeight: "700" },
  batchExpiry: { fontSize: 12, color: "#64748B", marginTop: 2 },
  batchPrice: { fontSize: 14, fontWeight: "700", color: "#0D9488", marginTop: 4 },
  batchStockActions: { alignItems: "flex-end" },
  batchStockQty: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  inStockText: { color: "#10B981" },
  outOfStockText: { color: "#EF4444" },
  addBatchBtn: { backgroundColor: "#0D9488", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  disabledBtn: { backgroundColor: "#CBD5E1" },
  addBatchBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  cartSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  closeBtnText: { color: "#64748B", fontWeight: "600", fontSize: 15 },
  emptyCartContainer: { alignItems: "center", marginVertical: 60 },
  emptyCartHeading: { fontSize: 16, fontWeight: "700", color: "#475569", marginBottom: 6 },
  emptyCartSub: { fontSize: 13, color: "#94A3B8" },
  cartList: { marginBottom: 16 },
  cartItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  cartItemDetails: { flex: 1.5 },
  cartItemName: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  cartItemMeta: { fontSize: 12, color: "#64748B", marginTop: 2 },
  individualGstText: { fontSize: 12, color: "#0D9488", fontWeight: "600", marginTop: 2 },
  qtyControl: { flexDirection: "row", alignItems: "center", marginHorizontal: 12 },
  qtyBtn: { backgroundColor: "#F1F5F9", width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 16, fontWeight: "700", color: "#475569" },
  qtyText: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginHorizontal: 10 },
  deleteCartItem: { paddingVertical: 6, paddingHorizontal: 10 },
  deleteText: { color: "#EF4444", fontSize: 12, fontWeight: "600" },
  paymentSection: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: 10, marginTop: 8 },
  pricingRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  pricingLabel: { fontSize: 14, color: "#64748B" },
  pricingValue: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 8 },
  grandTotalLabel: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  grandTotalValue: { fontSize: 18, fontWeight: "800", color: "#0D9488" },
  paymentGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  paymentOption: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingVertical: 10, alignItems: "center", marginHorizontal: 4 },
  paymentOptionSelected: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  paymentOptionText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  paymentOptionTextSelected: { color: "#fff" },
  checkoutBtn: { backgroundColor: "#0D9488", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  receiptContainer: { backgroundColor: "#fff", borderRadius: 24, marginHorizontal: 24, padding: 24, alignSelf: "stretch", marginTop: "20%" },
  receiptHeader: { alignItems: "center", marginBottom: 20 },
  successIcon: { fontSize: 32, color: "#10B981", backgroundColor: "#ECFDF5", width: 60, height: 60, borderRadius: 30, textAlign: "center", lineHeight: 60, marginBottom: 12 },
  receiptTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  receiptBody: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, marginBottom: 20 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  receiptLabel: { fontSize: 13, color: "#64748B" },
  receiptVal: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  dottedDivider: { borderStyle: "dashed", borderWidth: 1, borderColor: "#CBD5E1", marginVertical: 10, height: 0 },
  grandReceiptLabel: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  grandReceiptVal: { fontSize: 17, fontWeight: "800", color: "#0D9488" },
  closeReceiptBtn: { backgroundColor: "#0F172A", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  closeReceiptText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});