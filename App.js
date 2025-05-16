import React from 'react';
import { View } from 'react-native';
import FormLogin from './src/login/formLogin';
import styles from './src/login/style';

export default function App() {
  return (
    <View style={styles.container}>
      <FormLogin />
    </View>
  );
}