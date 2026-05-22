import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getBillDetailsApi, getBillsApi } from "../../api/bills.api";
import { useTheme } from "../../store/theme.store";

type PaymentMethodFilter = "ALL" | "UPI" | "CASH" | "CARD";

export default function BillHistoryScreen() {
  const { isDarkMode } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodFilter>("ALL");
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all bills using React Query
  const { data: bills = [], isLoading, refetch } = useQuery({
    queryKey: ["bills"],
    queryFn: getBillsApi,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filter logic for both search bar and payment method selector
  const filteredBills = bills.filter((bill) => {
    const matchesSearch = bill.bill_number.toLowerCase().includes(search.toLowerCase());
    const matchesMethod =
      selectedMethod === "ALL" ||
      bill.payment_method?.toUpperCase() === selectedMethod;

    return matchesSearch && matchesMethod;
  });

  const handleBillSelect = (billId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBillId(billId);
  };

  const handleMethodChange = (method: PaymentMethodFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMethod(method);
  };

  const filterOptions: PaymentMethodFilter[] = ["ALL", "UPI", "CASH", "CARD"];
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={[styles.container, currentStyles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Invoices History</Text>
          <Text style={styles.brandSubtitle}>Sales register and receipt logs</Text>
        </View>
      </View>

      {/* Control Area: Lookup & Payment Filtering */}
      <View style={styles.filterSection}>
        <TextInput
          style={[styles.searchInput, currentStyles.card, currentStyles.textMain]}
          placeholder="Filter by Invoice Number (e.g. BILL-2026)..."
          placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
          value={search}
          onChangeText={setSearch}
        />

        {/* Tab Selector Bar */}
        <View style={styles.tabContainer}>
          {filterOptions.map((method) => {
            const isActive = selectedMethod === method;
            return (
              <TouchableOpacity
                key={method}
                activeOpacity={0.7}
                onPress={() => handleMethodChange(method)}
                style={[
                  styles.tabButton,
                  currentStyles.card,
                  isActive && styles.activeTabButton,
                  isActive && method === "UPI" && styles.upiActiveBorder,
                  isActive && method === "CASH" && styles.cashActiveBorder,
                  isActive && method === "CARD" && styles.cardActiveBorder,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    currentStyles.textSub,
                    isActive && styles.activeTabText,
                    isActive && method === "UPI" && { color: "#A855F7" },
                    isActive && method === "CASH" && { color: "#22C55E" },
                    isActive && method === "CARD" && { color: "#3B82F6" },
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : filteredBills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyHeading, currentStyles.textMain]}>No Invoices Found</Text>
          <Text style={[styles.emptySub, currentStyles.textSub]}>No receipts match your search filters.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={(item) => item.bill_id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDarkMode ? "#34D399" : "#0D9488"}
              colors={["#0D9488"]}
            />
          }
          renderItem={({ item }) => (
            <Pressable style={[styles.billCard, currentStyles.card]} onPress={() => handleBillSelect(item.bill_id)}>
              <View style={styles.cardHeader}>
                <Text style={[styles.billNumber, currentStyles.textMain]}>{item.bill_number}</Text>
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
                <Text style={[styles.billDate, currentStyles.textSub]}>
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

function BillDetailsModal({ billId, onClose }: { billId: number; onClose: () => void }) {
  const { isDarkMode } = useTheme();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", billId],
    queryFn: () => getBillDetailsApi(billId),
  });

  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.receiptContainer, currentStyles.modalBody]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, currentStyles.textMain]}>Tax Invoice Detail</Text>
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
                  <Text style={[styles.receiptHeaderTitle, currentStyles.textMain]}>MEDIGO CLINICAL PHARMACY</Text>
                  <Text style={[styles.receiptHeaderSub, currentStyles.textSub]}>Lic: 24A-H651-409 • Tel: +91 9999988888</Text>
                  <View style={[styles.dottedDivider, { borderColor: isDarkMode ? "#475569" : "#CBD5E1" }]} />
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Invoice No:</Text>
                    <Text style={[styles.metaVal, currentStyles.textMain]}>{bill.bill_number}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Date:</Text>
                    <Text style={[styles.metaVal, currentStyles.textMain]}>
                      {new Date(bill.created_at).toLocaleDateString()} •{" "}
                      {new Date(bill.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Payment Mode:</Text>
                    <Text style={[styles.metaVal, currentStyles.textMain]}>{bill.payment_method.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={[styles.dottedDivider, { borderColor: isDarkMode ? "#475569" : "#CBD5E1" }]} />

                {/* Items listing table header */}
                <Text style={[styles.tableHeading, currentStyles.textSub]}>Itemized Medicines Breakdown</Text>

                {bill.items?.map((item) => (
                  <View key={item.bi_id} style={[styles.itemRow, currentStyles.container, { borderColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemName, currentStyles.textMain]}>{item.medicine?.name || "Medicine"}</Text>
                      <Text style={[styles.itemBatch, currentStyles.textSub]}>
                        Batch {item.batch?.batch_number || "N/A"} • GST {Number(item.gst_percentage)}%
                      </Text>
                    </View>
                    <View style={styles.itemPricing}>
                      <Text style={[styles.itemQtyMrp, currentStyles.textSub]}>
                        {item.quantity} x ₹{Number(item.mrp_per_unit).toFixed(2)}
                      </Text>
                      <Text style={[styles.itemTotal, currentStyles.textMain]}>₹{Number(item.total_price).toFixed(2)}</Text>
                    </View>
                  </View>
                ))}

                <View style={[styles.dottedDivider, { borderColor: isDarkMode ? "#475569" : "#CBD5E1" }]} />

                {/* Financial Summary */}
                <View style={styles.financialSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Gross Sale Total (Excl. Tax)</Text>
                    <Text style={[styles.summaryValue, currentStyles.textMain]}>₹{Number(bill.subtotal).toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total GST Tax Collected</Text>
                    <Text style={[styles.summaryValue, currentStyles.textMain]}>₹{Number(bill.total_gst).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, { marginTop: 6 }]}>
                    <Text style={[styles.grandSummaryLabel, currentStyles.textMain]}>Grand Total (Paid)</Text>
                    <Text style={styles.grandSummaryValue}>₹{Number(bill.grand_total).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Barcode Graphic */}
                <View style={styles.receiptBarcodeMock}>
                  <View style={styles.barcodeLines}>
                    {[3, 1, 5, 2, 6, 1, 4, 8, 2].map((width, index) => (
                      <View key={index} style={[styles.barcodeLine, { width, backgroundColor: isDarkMode ? "#94A3B8" : "#1E293B" }]} />
                    ))}
                  </View>
                  <Text style={[styles.barcodeNumber, currentStyles.textSub]}>{bill.bill_number}</Text>
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

const lightStyles = StyleSheet.create({
  container: { backgroundColor: "#F8FAFC" },
  card: { backgroundColor: "#fff", borderColor: "#E2E8F0" },
  modalBody: { backgroundColor: "#fff" },
  textMain: { color: "#0F172A" },
  textSub: { color: "#64748B" },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: "#0F172A" },
  card: { backgroundColor: "#1E293B", borderColor: "#334155" },
  modalBody: { backgroundColor: "#1E293B" },
  textMain: { color: "#F8FAFC" },
  textSub: { color: "#94A3B8" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: "#0D9488",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  brandSubtitle: { color: "#CCFBF1", fontSize: 12, fontWeight: "500" },
  filterSection: { paddingTop: 16, paddingHorizontal: 16 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15 },
  tabContainer: { flexDirection: "row", marginTop: 12, justifyContent: "space-between" },
  tabButton: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, marginHorizontal: 3, alignItems: "center", justifyContent: "center" },
  activeTabButton: { borderWidth: 1.5 },
  upiActiveBorder: { borderColor: "#C084FC", backgroundColor: "#F3E8FF" },
  cashActiveBorder: { borderColor: "#4ADE80", backgroundColor: "#DCFCE7" },
  cardActiveBorder: { borderColor: "#60A5FA", backgroundColor: "#DBEAFE" },
  tabText: { fontSize: 12, fontWeight: "700" },
  activeTabText: { fontWeight: "800" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyHeading: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: "center" },
  listContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  billCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  billNumber: { fontSize: 15, fontWeight: "800" },
  paymentBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  cashBadge: { backgroundColor: "#DCFCE7" },
  cashText: { color: "#166534" },
  cardBadge: { backgroundColor: "#DBEAFE" },
  cardText: { color: "#1E40AF" },
  upiBadge: { backgroundColor: "#F3E8FF" },
  upiText: { color: "#6B21A8" },
  paymentText: { fontSize: 10, fontWeight: "800" },
  cardDetails: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  billDate: { fontSize: 12 },
  grandTotalText: { fontSize: 17, fontWeight: "800", color: "#0D9488" },
  clickLabel: { fontSize: 11, color: "#94A3B8", marginTop: 12, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  receiptContainer: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40, height: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  closeBtnText: { color: "#64748B", fontWeight: "600", fontSize: 15 },
  receiptBody: { flex: 1 },
  metaSection: { alignItems: "center", marginVertical: 10 },
  receiptHeaderTitle: { fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  receiptHeaderSub: { fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginVertical: 3 },
  metaLabel: { fontSize: 13, color: "#64748B" },
  metaVal: { fontSize: 13, fontWeight: "700" },
  dottedDivider: { borderStyle: "dashed", borderWidth: 1, marginVertical: 12, height: 0, width: "100%" },
  tableHeading: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 12 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1 },
  itemMeta: { flex: 1.5 },
  itemName: { fontSize: 13, fontWeight: "700" },
  itemBatch: { fontSize: 11, marginTop: 2 },
  itemPricing: { alignItems: "flex-end" },
  itemQtyMrp: { fontSize: 12 },
  itemTotal: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  financialSummary: { paddingVertical: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 3 },
  summaryLabel: { fontSize: 13, color: "#64748B" },
  summaryValue: { fontSize: 13, fontWeight: "600" },
  grandSummaryLabel: { fontSize: 15, fontWeight: "800" },
  grandSummaryValue: { fontSize: 17, fontWeight: "800", color: "#0D9488" },
  receiptBarcodeMock: { alignItems: "center", marginTop: 24, marginBottom: 40 },
  barcodeLines: { flexDirection: "row", height: 36, alignItems: "center" },
  barcodeLine: { height: "100%", marginHorizontal: 1 },
  barcodeNumber: { fontSize: 10, marginTop: 4, letterSpacing: 2 },
  thankYouText: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginTop: 12, textTransform: "uppercase" },
});