import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BillingDeskScreen from "../screens/pharmacist/BillingDeskScreen";
import MedicineCatalogScreen from "../screens/pharmacist/MedicineCatalogScreen";
import BillHistoryScreen from "../screens/pharmacist/BillHistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useTheme } from "../store/theme.store"; 

const Tab = createBottomTabNavigator();

export default function PharmacistTabs() {
  const { isDarkMode } = useTheme(); 
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#0D9488",
        tabBarInactiveTintColor: isDarkMode ? "#64748B" : "#94A3B8",
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: isDarkMode ? "#1E293B" : "#fff",
            borderTopColor: isDarkMode ? "#334155" : "#E2E8F0",
          }
        ],
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
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size || 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
});