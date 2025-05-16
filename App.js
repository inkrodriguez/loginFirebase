import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import FormLogin from "./src/login/formLogin";
import HomeScreen from "./src/screens/HomeScreen";
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
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreenWrapper} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
