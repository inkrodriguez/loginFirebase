import React from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';

function TopBar({ planoTatuador }) {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.topbar}> 
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topbar: {
    paddingTop: Platform.OS === 'android' ? 15 : 15, // Valor ajustado aqui
    paddingBottom: 0,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    alignItems: 'center',
  },
  topbarTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default TopBar;
