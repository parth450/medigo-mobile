import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BillingDeskScreen from "../screens/pharmacist/BillingDeskScreen";
import MedicineCatalogScreen from "../screens/pharmacist/MedicineCatalogScreen";
import BillHistoryScreen from "../screens/pharmacist/BillHistoryScreen";

const Tab = createBottomTabNavigator();

export default function PharmacistTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#0D9488",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="BillingDesk"
        component={BillingDeskScreen}
        options={{
          tabBarLabel: "Billing Desk",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size || 22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Medicines"
        component={MedicineCatalogScreen}
        options={{
          tabBarLabel: "Medicines",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size || 22} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Invoices"
        component={BillHistoryScreen}
        options={{
          tabBarLabel: "Invoices",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size || 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    height: 64,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
});