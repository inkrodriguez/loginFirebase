import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import Agendamentos from './Agendamentos';  // componente de agendamento
import Financas from '../FinancesScreen';          // componente de finanças
import Pagamentos from './Pagamentos';      // componente de pagamentos

const Tab = createBottomTabNavigator();

export default function BottomNavigation() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Agendamentos') iconName = 'calendar';
          else if (route.name === 'Finanças') iconName = 'cash';
          else if (route.name === 'Pagamentos') iconName = 'card';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Agendamentos" component={Agendamentos} />
      <Tab.Screen name="Finanças" component={Financas} />
      <Tab.Screen name="Pagamentos" component={Pagamentos} />
    </Tab.Navigator>
  );
}
