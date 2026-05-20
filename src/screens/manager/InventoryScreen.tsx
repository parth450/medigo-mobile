import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  getMedicinesApi,
  createMedicineApi,
  getMedicineBatchesApi,
  createMedicineBatchApi,
  updateMedicineBatchApi,
} from "../../api/medicines.api";
import type { Medicine } from "../../types/api.types";
import { triggerLogout } from "../../api/axiosClient";

export default function InventoryScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedMedicineId, setExpandedMedicineId] = useState<number | null>(null);

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
  const [batchExpiry, setBatchExpiry] = useState(new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split("T")[0]); // 6 months default
  const [batchQty, setBatchQty] = useState("100");
  const [batchPurchase, setBatchPurchase] = useState("50");
  const [batchMrp, setBatchMrp] = useState("75");

  // Fetch inventory catalogue
  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ["medicines", search],
    queryFn: () => getMedicinesApi({ search }),
  });

  // Create Medicine Mutation
  const addMedicineMutation = useMutation({
    mutationFn: createMedicineApi,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      setIsAddMedVisible(false);
      Alert.alert("Success", "New medicine catalog details created successfully.");
      // Reset form
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
      setIsAddBatchVisible(false);
      Alert.alert("Success", `Stock batch successfully added under ${batchTargetMed?.name}.`);
      // Reset form
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

      {/* Filter Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Lookup medicine details or code..."
          placeholderTextColor="#94A3B8"
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
          <Text style={styles.emptyHeading}>Empty Inventory</Text>
          <Text style={styles.emptySub}>No active medicines catalog found.</Text>
        </View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.medCard}>
              <Pressable style={styles.medHeaderRow} onPress={() => handleToggleExpand(item.id)}>
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
              </Pressable>

              {/* Batches & Actions Expanded Section */}
              {expandedMedicineId === item.id && (
                <View style={styles.expandedSection}>
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
          <View style={styles.sheetContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Medicine Catalog</Text>
              <Pressable onPress={() => setIsAddMedVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
              <Text style={styles.formLabel}>Medicine Brand Name *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Lipitor" value={medName} onChangeText={setMedName} />

              <Text style={styles.formLabel}>Generic / Chemical Name</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Atorvastatin" value={medGeneric} onChangeText={setMedGeneric} />

              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {["tablet", "capsule", "syrup", "injection", "cream", "drops"].map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryOption,
                      medCategory === cat && styles.categoryOptionSelected,
                    ]}
                    onPress={() => setMedCategory(cat as any)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        medCategory === cat && styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>Manufacturer *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Pfizer" value={medManufacturer} onChangeText={setMedManufacturer} />

              <Text style={styles.formLabel}>Rack / Storage Location Coordinates *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Shelf A-Row 3" value={medRack} onChangeText={setMedRack} />

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.formLabel}>Prescription Required (Rx)</Text>
                  <Text style={styles.switchLabelSub}>Requires pharmacist verification</Text>
                </View>
                <Switch value={medRx} onValueChange={setMedRx} trackColor={{ true: "#0D9488" }} />
              </View>

              <Text style={styles.formLabel}>GST Percentage (%) *</Text>
              <TextInput style={styles.formInput} keyboardType="numeric" value={medGst} onChangeText={setMedGst} />

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
          <View style={styles.sheetContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refill Batch under {batchTargetMed?.name}</Text>
              <Pressable onPress={() => setIsAddBatchVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
              <Text style={styles.formLabel}>Batch Identity Code *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. B26-102" value={batchNum} onChangeText={setBatchNum} />

              <Text style={styles.formLabel}>Expiry Date (YYYY-MM-DD) *</Text>
              <TextInput style={styles.formInput} value={batchExpiry} onChangeText={setBatchExpiry} />

              <Text style={styles.formLabel}>Restock Quantity units *</Text>
              <TextInput style={styles.formInput} keyboardType="numeric" value={batchQty} onChangeText={setBatchQty} />

              <Text style={styles.formLabel}>Unit Purchase Price (₹) *</Text>
              <TextInput style={styles.formInput} keyboardType="numeric" value={batchPurchase} onChangeText={setBatchPurchase} />

              <Text style={styles.formLabel}>Unit Maximum Selling MRP (₹) *</Text>
              <TextInput style={styles.formInput} keyboardType="numeric" value={batchMrp} onChangeText={setBatchMrp} />

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

// Subcomponent managing batch lists and stock adjustments
function MedicineBatchesManager({
  medicine,
  onAddBatch,
}: {
  medicine: Medicine;
  onAddBatch: () => void;
}) {
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
    },
  });

  const handleAdjustQuantity = (batchId: number, currentQty: number, adjust: number) => {
    const nextQty = currentQty + adjust;
    if (nextQty < 0) return;
    adjustQtyMutation.mutate({
      batchId,
      data: { quantity: nextQty },
    });
  };

  if (isLoading) {
    return <ActivityIndicator size="small" color="#0D9488" style={{ padding: 16 }} />;
  }

  return (
    <View style={styles.managerSection}>
      <View style={styles.managerHeaderRow}>
        <Text style={styles.sectionSubtitle}>Active Inward Batches</Text>
        <Pressable style={styles.actionAddBatchBtn} onPress={onAddBatch}>
          <Text style={styles.actionAddBatchBtnText}>+ Inward Batch</Text>
        </Pressable>
      </View>

      {batches.length === 0 ? (
        <Text style={styles.emptyBatchMsg}>No stock batches exist. Inward new batch above.</Text>
      ) : (
        batches.map((batch) => (
          <View key={batch.mb_id} style={styles.batchRow}>
            <View>
              <Text style={styles.batchTitle}>Batch {batch.batch_number}</Text>
              <Text style={styles.batchDates}>
                Exp: {new Date(batch.expiry_date).toLocaleDateString()}
              </Text>
              <Text style={styles.batchFinances}>
                Purchase: ₹{Number(batch.purchase_price).toFixed(2)} • MRP: ₹
                {Number(batch.mrp).toFixed(2)}
              </Text>
            </View>

            <View style={styles.qtyControlSection}>
              <Text style={styles.stockLabel}>Stock: {batch.quantity} u</Text>
              <View style={styles.adjustRow}>
                <Pressable
                  style={styles.adjustBtn}
                  onPress={() => handleAdjustQuantity(batch.mb_id, batch.quantity, -10)}
                >
                  <Text style={styles.adjustBtnText}>-10</Text>
                </Pressable>
                <Pressable
                  style={styles.adjustBtn}
                  onPress={() => handleAdjustQuantity(batch.mb_id, batch.quantity, 10)}
                >
                  <Text style={styles.adjustBtnText}>+10</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
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
  addMedBtn: {
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
  addMedBtnText: {
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
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  managerSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },
  managerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
  },
  actionAddBatchBtn: {
    backgroundColor: "#0D9488",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionAddBatchBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyBatchMsg: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginVertical: 12,
  },
  batchRow: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  batchDates: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  batchFinances: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0D9488",
    marginTop: 2,
  },
  qtyControlSection: {
    alignItems: "flex-end",
  },
  stockLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  adjustRow: {
    flexDirection: "row",
  },
  adjustBtn: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  adjustBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 4,
  },
  categoryOption: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  categoryOptionSelected: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  categoryOptionText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  categoryOptionTextSelected: {
    color: "#fff",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
  },
  switchLabelSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
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
