import React, {useEffect,useState, } from "react";

import { NavigationContainer,} from "@react-navigation/native";

import { View, ActivityIndicator, } from "react-native";

import AuthStack from "./AuthStack";

import MainNavigator   from "./MainNavigator";

import { AuthStorage } from "../store/auth.store";

import { setOnUnauthorized } from "../api/axiosClient";

import type { User, } from "../types/auth.types";

export default function AppNavigator() {

  const [loading, setLoading] = useState(true);

  const [user, setUser] =
    useState<User | null>(null);

  useEffect(() => {

    setOnUnauthorized(() => {
      setUser(null);
    });

    const bootstrap = () => {

      const token =
        AuthStorage.getToken();

      const storedUser =
        AuthStorage.getUser();

      if (
        token &&
        storedUser
      ) {
        setUser(storedUser);
      }

      setLoading(false);
    };

    bootstrap();

  }, []);

  if (loading) {

    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>

      {user ? (

        <MainNavigator
          user={user}
          setUser={setUser}
        />

      ) : (

        <AuthStack
          setUser={setUser}
        />

      )}

    </NavigationContainer>
  );
}