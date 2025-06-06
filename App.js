import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PaperProvider } from 'react-native-paper';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";

import FormLogin from "./src/login/formLogin";
import PainelAdm from "./src/screens/PainelAdm";
import Loja from "./src/screens/Loja";
import HomeScreen from "./src/screens/HomeScreen";
import Tabs from "./src/screens/Tabs";
import styles from "./src/login/style";

const Stack = createNativeStackNavigator();

function LoginScreenWrapper() {
  return (
    
    <View style={styles.container}>
      <FormLogin />
    </View>
  );
}

export default function App() {
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email || null);
    });

    return unsubscribe;
  }, []);

  const isAdmin = userEmail === "admin@estudioshodo.com";

  return (
    <PaperProvider>
      <View style={stylesApp.containerApp}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreenWrapper} />
            <Stack.Screen name="Loja" component={Loja} />
            {isAdmin ? (
              <Stack.Screen name="PainelAdm" component={PainelAdm} />
            ) : (
              <Stack.Screen name="Home" component={Tabs} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </PaperProvider>
  );
}

const stylesApp = StyleSheet.create({
  containerApp: {
    flex: 1,
    maxWidth: 480,
    width: "100%",
    marginHorizontal: "auto",
    alignSelf: "center",
  },
});
