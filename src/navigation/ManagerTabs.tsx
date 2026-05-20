import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "../screens/manager/DashboardScreen";
import InventoryScreen from "../screens/manager/InventoryScreen";
import StaffManagementScreen from "../screens/manager/StaffManagementScreen";

const Tab = createBottomTabNavigator();

export default function ManagerTabs() {
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
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size || 22} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarLabel: "Inventory",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Employees"
        component={StaffManagementScreen}
        options={{
          tabBarLabel: "Employees",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size || 22} color={color} />
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