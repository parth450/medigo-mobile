import React from "react";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import LoginScreen from "../screens/auth/LoginScreen";

import type { User } from "../types/auth.types";

const Stack =
  createNativeStackNavigator();

interface Props {
  setUser: React.Dispatch<
    React.SetStateAction<User | null>
  >;
}

export default function AuthStack({
  setUser,
}: Props) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {() => (
          <LoginScreen
            setUser={setUser}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}