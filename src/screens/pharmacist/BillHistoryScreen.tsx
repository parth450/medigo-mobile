import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { getBillsApi, getBillDetailsApi } from "../../api/bills.api";
import type { Bill } from "../../types/api.types";
import { triggerLogout } from "../../api/axiosClient";

export default function BillHistoryScreen() {
  const [search, setSearch] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  // Fetch all bills using React Query
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["bills"],
    queryFn: getBillsApi,
  });

  const filteredBills = bills.filter((bill) =>
    bill.bill_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleBillSelect = (billId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBillId(billId);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Invoices History</Text>
          <Text style={styles.brandSubtitle}>Sales register and receipt logs</Text>
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

      {/* Lookup Bar */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by Invoice Number (e.g. BILL-2026)..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : filteredBills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyHeading}>No Invoices Found</Text>
          <Text style={styles.emptySub}>No receipts match your search filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={(item) => item.bill_id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <Pressable style={styles.billCard} onPress={() => handleBillSelect(item.bill_id)}>
              <View style={styles.cardHeader}>
                <Text style={styles.billNumber}>{item.bill_number}</Text>
                <View
                  style={[
                    styles.paymentBadge,
                    item.payment_method === "cash" && styles.cashBadge,
                    item.payment_method === "card" && styles.cardBadge,
                    item.payment_method === "upi" && styles.upiBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentText,
                      item.payment_method === "cash" && styles.cashText,
                      item.payment_method === "card" && styles.cardText,
                      item.payment_method === "upi" && styles.upiText,
                    ]}
                  >
                    {item.payment_method.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <Text style={styles.billDate}>
                  {new Date(item.created_at).toLocaleDateString()} •{" "}
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text style={styles.grandTotalText}>₹{Number(item.grand_total).toFixed(2)}</Text>
              </View>
              <Text style={styles.clickLabel}>Click to view full receipt Details →</Text>
            </Pressable>
          )}
        />
      )}

      {/* Bill Receipt Details Modal */}
      {selectedBillId && (
        <BillDetailsModal
          billId={selectedBillId}
          onClose={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedBillId(null);
          }}
        />
      )}
    </View>
  );
}

// Modal popup component to retrieve detailed line-item receipts dynamically
function BillDetailsModal({ billId, onClose }: { billId: number; onClose: () => void }) {
  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", billId],
    queryFn: () => getBillDetailsApi(billId),
  });

  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.receiptContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tax Invoice Detail</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 80 }} />
          ) : !bill ? (
            <Text style={styles.emptyHeading}>Failed to load receipt.</Text>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.receiptBody}>
                {/* Meta details */}
                <View style={styles.metaSection}>
                  <Text style={styles.receiptHeaderTitle}>MEDIGO CLINICAL PHARMACY</Text>
                  <Text style={styles.receiptHeaderSub}>Lic: 24A-H651-409 • Tel: +91 9999988888</Text>
                  <View style={styles.dottedDivider} />
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Invoice No:</Text>
                    <Text style={styles.metaVal}>{bill.bill_number}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Date:</Text>
                    <Text style={styles.metaVal}>
                      {new Date(bill.created_at).toLocaleDateString()} •{" "}
                      {new Date(bill.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Payment Mode:</Text>
                    <Text style={styles.metaVal}>{bill.payment_method.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.dottedDivider} />

                {/* Items listing table header */}
                <Text style={styles.tableHeading}>Itemized Medicines Breakdown</Text>
                
                {bill.items?.map((item) => (
                  <View key={item.bi_id} style={styles.itemRow}>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemName}>{item.medicine?.name || "Medicine"}</Text>
                      <Text style={styles.itemBatch}>
                        Batch {item.batch?.batch_number || "N/A"} • GST {Number(item.gst_percentage)}%
                      </Text>
                    </View>
                    <View style={styles.itemPricing}>
                      <Text style={styles.itemQtyMrp}>
                        {item.quantity} x ₹{Number(item.mrp_per_unit).toFixed(2)}
                      </Text>
                      <Text style={styles.itemTotal}>₹{Number(item.total_price).toFixed(2)}</Text>
                    </View>
                  </View>
                ))}

                <View style={styles.dottedDivider} />

                {/* Financial Summary */}
                <View style={styles.financialSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Gross Sale Total (Excl. Tax)</Text>
                    <Text style={styles.summaryValue}>₹{Number(bill.subtotal).toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total GST Tax Collected</Text>
                    <Text style={styles.summaryValue}>₹{Number(bill.total_gst).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, { marginTop: 6 }]}>
                    <Text style={styles.grandSummaryLabel}>Grand Total (Paid)</Text>
                    <Text style={styles.grandSummaryValue}>₹{Number(bill.grand_total).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Barcode Graphic */}
                <View style={styles.receiptBarcodeMock}>
                  <View style={styles.barcodeLines}>
                    <View style={[styles.barcodeLine, { width: 3 }]} />
                    <View style={[styles.barcodeLine, { width: 1 }]} />
                    <View style={[styles.barcodeLine, { width: 5 }]} />
                    <View style={[styles.barcodeLine, { width: 2 }]} />
                    <View style={[styles.barcodeLine, { width: 6 }]} />
                    <View style={[styles.barcodeLine, { width: 1 }]} />
                    <View style={[styles.barcodeLine, { width: 4 }]} />
                    <View style={[styles.barcodeLine, { width: 8 }]} />
                    <View style={[styles.barcodeLine, { width: 2 }]} />
                  </View>
                  <Text style={styles.barcodeNumber}>{bill.bill_number}</Text>
                  <Text style={styles.thankYouText}>Thank you for your visit!</Text>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
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
  billCard: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  billNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  paymentBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  cashBadge: {
    backgroundColor: "#DCFCE7",
  },
  cashText: {
    color: "#166534",
  },
  cardBadge: {
    backgroundColor: "#DBEAFE",
  },
  cardText: {
    color: "#1E40AF",
  },
  upiBadge: {
    backgroundColor: "#F3E8FF",
  },
  upiText: {
    color: "#6B21A8",
  },
  paymentText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billDate: {
    fontSize: 12,
    color: "#64748B",
  },
  grandTotalText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0D9488",
  },
  clickLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  receiptContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    height: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
  receiptBody: {
    flex: 1,
  },
  metaSection: {
    alignItems: "center",
    marginVertical: 10,
  },
  receiptHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  receiptHeaderSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 3,
  },
  metaLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  metaVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  dottedDivider: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginVertical: 12,
    height: 0,
    width: "100%",
  },
  tableHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  itemMeta: {
    flex: 1.5,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  itemBatch: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  itemPricing: {
    alignItems: "flex-end",
  },
  itemQtyMrp: {
    fontSize: 12,
    color: "#475569",
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },
  financialSummary: {
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  grandSummaryLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  grandSummaryValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0D9488",
  },
  receiptBarcodeMock: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  barcodeLines: {
    flexDirection: "row",
    height: 36,
    alignItems: "center",
  },
  barcodeLine: {
    backgroundColor: "#1E293B",
    height: "100%",
    marginHorizontal: 1,
  },
  barcodeNumber: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    letterSpacing: 2,
  },
  thankYouText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    marginTop: 12,
    textTransform: "uppercase",
  },
});
