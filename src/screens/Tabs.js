import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import FinancesScreen from './FinancesScreen';
import HomeScreen from './HomeScreen';

  function Dashboard() {
    return (
      <View style={{
        flex: 1,
        maxWidth: 480,
        width: '100%',
        marginHorizontal: 'auto',
        alignSelf: 'center',
      }}>
        <HomeScreen />
      </View>
    );
  }

const Tab = createBottomTabNavigator();

export default function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, 
        tabBarActiveTintColor: '#000', // Cor quando está ativo
        tabBarInactiveTintColor: 'gray', // Cor quando está inativo
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Início') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Finanças') {
            iconName = focused ? 'cash' : 'cash-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início" component={Dashboard} />
      <Tab.Screen name="Finanças" component={FinancesScreen} />
    </Tab.Navigator>
  );
}
