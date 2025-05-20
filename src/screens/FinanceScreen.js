import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FinanceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>FINANCEIRO - DESENVOLVIMENTO!</Text>
      {/* Em breve: resumo financeiro */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});
