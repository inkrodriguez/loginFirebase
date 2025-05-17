// src/navigation/Tabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import FinanceScreen from '../screens/FinanceScreen';
import PaymentScreen from '../screens/PaymentScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Agendamentos') {
            iconName = 'calendar';
          } else if (route.name === 'Finanças') {
            iconName = 'cash';
          } else if (route.name === 'Mensalidade') {
            iconName = 'card';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#27ae60',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Agendamentos" component={HomeScreen} />
      <Tab.Screen name="Finanças" component={FinanceScreen} />
      <Tab.Screen name="Mensalidade" component={PaymentScreen} />
    </Tab.Navigator>
  );
}
