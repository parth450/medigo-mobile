import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { createBillApi } from "../../api/bills.api";
import { useCart } from "../../store/cart.store";

export default function ActiveBillScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const {
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    totalGst,
    grandTotal,
    paymentMethod,
    setPaymentMethod,
    clearCart,
    setSuccessBillData,
    setIsCheckoutSuccess,
  } = useCart();

  const checkoutMutation = useMutation({
    mutationFn: createBillApi,
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessBillData(data);
      setIsCheckoutSuccess(true);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log('Billing error object:', error);
      console.log('Error response data:', error?.response?.data);
      const backendErrorMessage = error?.response?.data?.message;
      const parsedMessage = Array.isArray(backendErrorMessage)
        ? backendErrorMessage.join(', ')
        : backendErrorMessage;
      Alert.alert('Billing Failure', parsedMessage || 'Internal server issue or stock mismatch.');
    },
  });

  if (items.length === 0) {
    return (
      <View style={styles.emptyCartContainer}>
        <Text style={styles.emptyCartHeading}>Invoice is Empty</Text>
        <Text style={styles.emptyCartSub}>Select medicines on the billing desk to add them here.</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Return to Lookup</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.batch.mb_id.toString()}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <View style={styles.cartItemRow}>
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
        )}
        ListFooterComponent={
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
              style={[styles.checkoutBtn, checkoutMutation.isPending && styles.disabledBtn]}
              disabled={checkoutMutation.isPending}
              onPress={() => {
                // 🧠 Group basket selections by medicine ID and calculate total counts
                const consolidatedItemsMap = items.reduce((accumulator, currentItem) => {
                  const medicineId = currentItem.medicine.id;

                  if (accumulator[medicineId]) {
                    accumulator[medicineId].quantity += currentItem.quantity;
                  } else {
                    accumulator[medicineId] = {
                      medicine_id: medicineId,
                      quantity: currentItem.quantity,
                    };
                  }
                  return accumulator;
                }, {} as Record<number, { medicine_id: number; quantity: number }>);

                // 🛠️ Construct final payload using the consolidated values array
                const payload = {
                  payment_method: paymentMethod,
                  items: Object.values(consolidatedItemsMap),
                };

                console.log('Validated Merged Sync Payload Dispatching:', JSON.stringify(payload));
                checkoutMutation.mutate(payload);
              }}
            >
              {checkoutMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.checkoutBtnText}>Complete & Generate Bill</Text>
              )}
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  emptyCartContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC", padding: 20 },
  emptyCartHeading: { fontSize: 18, fontWeight: "700", color: "#475569" },
  emptyCartSub: { fontSize: 14, color: "#94A3B8", marginTop: 4, marginBottom: 20, textAlign: "center" },
  backBtn: { backgroundColor: "#0D9488", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backBtnText: { color: "#fff", fontWeight: "700" },
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
  paymentSection: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, marginTop: 16 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: 10, marginTop: 8 },
  pricingRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  pricingLabel: { fontSize: 14, color: "#64748B" },
  pricingValue: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 8 },
  grandTotalLabel: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  grandTotalValue: { fontSize: 18, fontWeight: "800", color: "#0D9488" },
  paymentGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, marginTop: 4 },
  paymentOption: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingVertical: 10, alignItems: "center", marginHorizontal: 4 },
  paymentOptionSelected: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  paymentOptionText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  paymentOptionTextSelected: { color: "#fff" },
  checkoutBtn: { backgroundColor: "#0D9488", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  disabledBtn: { backgroundColor: "#CBD5E1" },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});