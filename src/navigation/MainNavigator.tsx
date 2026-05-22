
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PharmacistTabs from "./PharmacistTabs";
import ManagerTabs from "./ManagerTabs";
import ActiveBillScreen from "../screens/pharmacist/ActiveBillScreen"; 
import type { User } from "../types/auth.types";

const Stack = createNativeStackNavigator();

interface Props {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function MainNavigator({ user }: Props) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {user.role === "pharmacist" && (
        <>
  
          <Stack.Screen name="Pharmacist" component={PharmacistTabs} />
          
         
          <Stack.Screen 
            name="ActiveBill" 
            component={ActiveBillScreen} 
            options={{
              headerShown: true,
              headerTitle: "Active Invoice",
              headerTintColor: "#0D9488", 
              headerBackTitle: "Desk",
              
              animation: "slide_from_right" 
            }}
          />
        </>
      )}

      {user.role === "store_manager" && (
        <Stack.Screen name="Manager" component={ManagerTabs} />
      )}
    </Stack.Navigator>
  );
}