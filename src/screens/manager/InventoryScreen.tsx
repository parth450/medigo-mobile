import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  StatusBar,
} from "react-native";
import {
  createMedicineApi,
  createMedicineBatchApi,
  getMedicineBatchesApi,
  getMedicinesApi,
  updateMedicineBatchApi,
} from "../../api/medicines.api";
import { useTheme } from "../../store/theme.store";
import type { Medicine } from "../../types/api.types";

export default function InventoryScreen() {
  const isDarkMode = useTheme((state) => state.isDarkMode);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedMedicineId, setExpandedMedicineId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals visibility state
  const [isAddMedVisible, setIsAddMedVisible] = useState(false);
  const [isAddBatchVisible, setIsAddBatchVisible] = useState(false);
  const [batchTargetMed, setBatchTargetMed] = useState<Medicine | null>(null);

  // Add Medicine Form state
  const [medName, setMedName] = useState("");
  const [medGeneric, setMedGeneric] = useState("");
  const [medCategory, setMedCategory] = useState<"tablet" | "capsule" | "syrup" | "injection" | "cream" | "drops">("tablet");
  const [medManufacturer, setMedManufacturer] = useState("");
  const [medRack, setMedRack] = useState("");
  const [medRx, setMedRx] = useState(false);
  const [medGst, setMedGst] = useState("12");

  // Add Batch Form state
  const [batchNum, setBatchNum] = useState("");
  const [batchExpiry, setBatchExpiry] = useState(new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [batchQty, setBatchQty] = useState("100");
  const [batchPurchase, setBatchPurchase] = useState("50");
  const [batchMrp, setBatchMrp] = useState("75");

  // Fetch inventory data catalogue (Fallback provided for query configuration reliability)
  const { data: medicines = [], isLoading, refetch } = useQuery({
    queryKey: ["medicines", search],
    queryFn: () => getMedicinesApi({ search: search || "" }),
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Create Medicine Mutation
  const addMedicineMutation = useMutation({
    mutationFn: createMedicineApi,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      setIsAddMedVisible(false);
      Alert.alert("Success", "New medicine catalog details created successfully.");
      setMedName("");
      setMedGeneric("");
      setMedCategory("tablet");
      setMedManufacturer("");
      setMedRack("");
      setMedRx(false);
      setMedGst("12");
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error?.response?.data?.message || "Failed to create medicine.");
    },
  });

  // Create Batch Mutation
  const addBatchMutation = useMutation({
    mutationFn: ({ medicineId, data }: { medicineId: number; data: any }) =>
      createMedicineBatchApi(medicineId, data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["batches", batchTargetMed?.id] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      setIsAddBatchVisible(false);
      Alert.alert("Success", `Stock batch successfully added under ${batchTargetMed?.name}.`);
      setBatchNum("");
      setBatchQty("100");
      setBatchPurchase("50");
      setBatchMrp("75");
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error?.response?.data?.message || "Failed to create batch.");
    },
  });

  const handleCreateMedicine = () => {
    if (!medName || !medManufacturer || !medRack) {
      Alert.alert("Required Fields", "Please complete name, manufacturer, and rack location.");
      return;
    }
    addMedicineMutation.mutate({
      name: medName,
      generic_name: medGeneric || undefined,
      category: medCategory,
      manufacturer: medManufacturer,
      rack_location: medRack,
      prescription_required: medRx,
      gst_percentage: Number(medGst),
    });
  };

  const handleCreateBatch = () => {
    if (!batchTargetMed) return;
    if (!batchNum || !batchExpiry || !batchQty || !batchPurchase || !batchMrp) {
      Alert.alert("Required Fields", "Please complete all fields to establish a batch.");
      return;
    }
    addBatchMutation.mutate({
      medicineId: batchTargetMed.id,
      data: {
        batch_number: batchNum,
        expiry_date: new Date(batchExpiry).toISOString(),
        quantity: Number(batchQty),
        purchase_price: Number(batchPurchase),
        mrp: Number(batchMrp),
      },
    });
  };

  const handleToggleExpand = (medicineId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedMedicineId(expandedMedicineId === medicineId ? null : medicineId);
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View style={[styles.container, currentStyles.container]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D9488" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <View>
            <Text style={styles.brandTitle}>Inventory Control</Text>
            <Text style={styles.brandSubtitle}>Manage stock catalogue and refills</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              style={styles.addMedBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAddMedVisible(true);
              }}
            >
              <Text style={styles.addMedBtnText}>+ Catalog</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={[styles.searchInput, currentStyles.input, currentStyles.textMain]}
          placeholder="Lookup medicine details or code..."
          placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : medicines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyHeading, currentStyles.textMain]}>Empty Inventory</Text>
          <Text style={[styles.emptySub, currentStyles.textSub]}>No active medicines catalog found.</Text>
        </View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDarkMode ? "#34D399" : "#0D9488"}
              colors={["#0D9488"]}
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.medCard, currentStyles.card]}>
              <Pressable style={styles.medHeaderRow} onPress={() => handleToggleExpand(item.id)}>
                <View style={styles.medInfo}>
                  <Text style={[styles.medName, currentStyles.textMain]}>{item.name}</Text>
                  {item.generic_name && (
                    <Text style={[styles.genericName, currentStyles.textSub]}>{item.generic_name}</Text>
                  )}
                  <View style={styles.metaBadgeGrid}>
                    <View style={[styles.metaBadge, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
                      <Text style={[styles.metaBadgeText, currentStyles.textMain]}>{item.category}</Text>
                    </View>
                    <View style={[styles.metaBadge, styles.locationBadge, { backgroundColor: isDarkMode ? "#062E2A" : "#F0FDFA" }]}>
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
              </Pressable>

              {expandedMedicineId === item.id && (
                <View style={[styles.expandedSection, { borderTopColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
                  <MedicineBatchesManager
                    medicine={item}
                    onAddBatch={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBatchTargetMed(item);
                      setIsAddBatchVisible(true);
                    }}
                  />
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Modal: Add New Medicine */}
      <Modal visible={isAddMedVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContainer, currentStyles.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, currentStyles.textMain]}>Add New Medicine Catalog</Text>
              <Pressable onPress={() => setIsAddMedVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
              <Text style={[styles.formLabel, currentStyles.textMain]}>Medicine Brand Name *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} placeholder="e.g. Lipitor" placeholderTextColor="#64748B" value={medName} onChangeText={setMedName} />

              <Text style={[styles.formLabel, currentStyles.textMain]}>Generic / Chemical Name</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} placeholder="e.g. Atorvastatin" placeholderTextColor="#64748B" value={medGeneric} onChangeText={setMedGeneric} />

              <Text style={[styles.formLabel, currentStyles.textMain]}>Category</Text>
              <View style={styles.categoryGrid}>
                {["tablet", "capsule", "syrup", "injection", "cream", "drops"].map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryOption,
                      isDarkMode ? { backgroundColor: "#334155", borderColor: "#475569" } : { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
                      medCategory === cat && styles.categoryOptionSelected,
                    ]}
                    onPress={() => setMedCategory(cat as any)}
                  >
                    <Text style={[styles.categoryOptionText, isDarkMode ? { color: "#94A3B8" } : { color: "#64748B" }, medCategory === cat && styles.categoryOptionTextSelected]}>
                      {cat.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, currentStyles.textMain]}>Manufacturer *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} placeholder="e.g. Pfizer" placeholderTextColor="#64748B" value={medManufacturer} onChangeText={setMedManufacturer} />

              <Text style={[styles.formLabel, currentStyles.textMain]}>Rack / Storage Location Coordinates *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} placeholder="e.g. Shelf A-Row 3" placeholderTextColor="#64748B" value={medRack} onChangeText={setMedRack} />

              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.formLabel, currentStyles.textMain]}>Prescription Required (Rx)</Text>
                  <Text style={[styles.switchLabelSub, currentStyles.textSub]}>Requires pharmacist verification</Text>
                </View>
                <Switch value={medRx} onValueChange={setMedRx} trackColor={{ true: "#0D9488" }} />
              </View>

              <Text style={[styles.formLabel, currentStyles.textMain]}>GST Percentage (%) *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} keyboardType="numeric" value={medGst} onChangeText={setMedGst} />

              {addMedicineMutation.isPending ? (
                <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 20 }} />
              ) : (
                <Pressable style={styles.submitBtn} onPress={handleCreateMedicine}>
                  <Text style={styles.submitBtnText}>Create Catalogue Details</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Medicine Batch */}
      <Modal visible={isAddBatchVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContainer, currentStyles.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, currentStyles.textMain]} numberOfLines={1}>Refill Batch under {batchTargetMed?.name}</Text>
              <Pressable onPress={() => setIsAddBatchVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
              <Text style={[styles.formLabel, currentStyles.textMain]}>Batch Identity Code *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} placeholder="e.g. B26-102" placeholderTextColor="#64748B" value={batchNum} onChangeText={setBatchNum} />

              <Text style={[styles.formLabel, currentStyles.textMain]}>Expiry Date (YYYY-MM-DD) *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} value={batchExpiry} onChangeText={setBatchExpiry} />

              <Text style={[styles.formLabel, currentStyles.textMain]}>Restock Quantity units *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} keyboardType="numeric" value={batchQty} onChangeText={setBatchQty} />

              <Text style={[styles.formLabel, currentStyles.textMain]}>Unit Purchase Price (₹) *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} keyboardType="numeric" value={batchPurchase} onChangeText={setBatchPurchase} />

              <Text style={[styles.formLabel, currentStyles.textMain]}>Unit Maximum Selling MRP (₹) *</Text>
              <TextInput style={[styles.formInput, currentStyles.input, currentStyles.textMain]} keyboardType="numeric" value={batchMrp} onChangeText={setBatchMrp} />

              {addBatchMutation.isPending ? (
                <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 20 }} />
              ) : (
                <Pressable style={styles.submitBtn} onPress={handleCreateBatch}>
                  <Text style={styles.submitBtnText}>Inward Stock Batch</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MedicineBatchesManager({ medicine, onAddBatch }: { medicine: Medicine; onAddBatch: () => void }) {
  const isDarkMode = useTheme((state) => state.isDarkMode);
  const queryClient = useQueryClient();
  
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["batches", medicine.id],
    queryFn: () => getMedicineBatchesApi(medicine.id),
  });

  const adjustQtyMutation = useMutation({
    mutationFn: ({ batchId, data }: { batchId: number; data: any }) =>
      updateMedicineBatchApi(batchId, data),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      queryClient.invalidateQueries({ queryKey: ["batches", medicine.id] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });

  const handleAdjustQuantity = (batchId: number, currentQty: number, adjust: number) => {
    const nextQty = currentQty + adjust;
    if (nextQty < 0) return;
    adjustQtyMutation.mutate({ batchId, data: { quantity: nextQty } });
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  if (isLoading) {
    return <ActivityIndicator size="small" color="#0D9488" style={{ padding: 16 }} />;
  }

  return (
    <View style={[styles.managerSection, { backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC" }]}>
      <View style={styles.managerHeaderRow}>
        <Text style={[styles.sectionSubtitle, currentStyles.textMain]}>Active Inward Batches</Text>
        <Pressable style={styles.actionAddBatchBtn} onPress={onAddBatch}>
          <Text style={styles.actionAddBatchBtnText}>+ Inward Batch</Text>
        </Pressable>
      </View>

      {batches.length === 0 ? (
        <Text style={[styles.emptyBatchMsg, currentStyles.textSub]}>No stock batches exist. Inward new batch above.</Text>
      ) : (
        batches.map((batch) => (
          <View key={batch.mb_id} style={[styles.batchRow, currentStyles.card]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.batchTitle, currentStyles.textMain]}>Batch {batch.batch_number}</Text>
              <Text style={[styles.batchDates, currentStyles.textSub]}>
                Exp: {new Date(batch.expiry_date).toLocaleDateString()}
              </Text>
              <Text style={[styles.batchFinances, currentStyles.textSub]}>
                Purchase: ₹{Number(batch.purchase_price).toFixed(2)} • MRP: ₹{Number(batch.mrp).toFixed(2)}
              </Text>
            </View>

            <View style={styles.qtyControlSection}>
              <Text style={[styles.stockLabel, currentStyles.textMain]}>Stock: {batch.quantity} u</Text>
              <View style={styles.adjustRow}>
                <Pressable style={[styles.adjustBtn, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]} onPress={() => handleAdjustQuantity(batch.mb_id, batch.quantity, -10)}>
                  <Text style={[styles.adjustBtnText, currentStyles.textMain]}>-10</Text>
                </Pressable>
                <Pressable style={[styles.adjustBtn, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]} onPress={() => handleAdjustQuantity(batch.mb_id, batch.quantity, 10)}>
                  <Text style={[styles.adjustBtnText, currentStyles.textMain]}>+10</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const lightStyles = StyleSheet.create({
  container: { backgroundColor: "#F8FAFC" },
  card: { backgroundColor: "#fff", borderColor: "#F1F5F9" },
  input: { backgroundColor: "#fff", borderColor: "#E2E8F0", color: "#1E293B" },
  textMain: { color: "#0F172A" },
  textSub: { color: "#64748B" },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: "#0F172A" },
  card: { backgroundColor: "#1E293B", borderColor: "#334155" },
  input: { backgroundColor: "#1E293B", borderColor: "#334155", color: "#F8FAFC" },
  textMain: { color: "#F8FAFC" },
  textSub: { color: "#94A3B8" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: "#0D9488", paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brandTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  brandSubtitle: { color: "#CCFBF1", fontSize: 12, fontWeight: "500" },
  addMedBtn: { backgroundColor: "#0F766E", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addMedBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  searchSection: { padding: 16 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyHeading: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptySub: { fontSize: 13 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
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
  expandedSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  managerSection: { borderRadius: 12, padding: 12 },
  managerHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionSubtitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  actionAddBatchBtn: { backgroundColor: "#0D9488", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  actionAddBatchBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  emptyBatchMsg: { fontSize: 12, textAlign: "center", marginVertical: 12 },
  batchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, marginBottom: 8, borderRadius: 8, borderWidth: 1 },
  batchTitle: { fontSize: 14, fontWeight: "700" },
  batchDates: { fontSize: 11, marginTop: 2 },
  batchFinances: { fontSize: 12, marginTop: 2 },
  qtyControlSection: { alignItems: "flex-end" },
  stockLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  adjustRow: { flexDirection: "row", gap: 6 },
  adjustBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  adjustBtnText: { fontSize: 11, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  sheetContainer: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, height: "85%", borderWidth: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", flex: 1, marginRight: 8 },
  closeBtnText: { color: "#64748B", fontWeight: "600", fontSize: 15 },
  formContainer: { flex: 1 },
  formLabel: { fontSize: 13, fontWeight: "700", marginTop: 14, marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, marginBottom: 4 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  categoryOption: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  categoryOptionSelected: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  categoryOptionText: { fontSize: 11, fontWeight: "700" },
  categoryOptionTextSelected: { color: "#fff" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingRight: 4 },
  switchLabelSub: { fontSize: 11, marginTop: 2 },
  submitBtn: { backgroundColor: "#0D9488", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 28, marginBottom: 20 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});