// src/screens/CadastrarTatuador.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function CadastrarTatuador() {
  const [email, setEmail] = useState('');
  const [plano, setPlano] = useState('');

  const handleCadastrar = async () => {
    if (!email || !plano) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    try {
      await addDoc(collection(db, 'tatuadores'), { email, plano });
      Alert.alert('Sucesso', 'Tatuador cadastrado com sucesso!');
      setEmail('');
      setPlano('');
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      Alert.alert('Erro', 'Não foi possível cadastrar o tatuador.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212', padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 20, marginBottom: 12 }}>
        Cadastrar Tatuador
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        style={{ color: '#fff', backgroundColor: '#1e1e1e', padding: 10, marginBottom: 10, borderRadius: 8 }}
      />

      <TextInput
        placeholder="Plano"
        placeholderTextColor="#aaa"
        value={plano}
        onChangeText={setPlano}
        style={{ color: '#fff', backgroundColor: '#1e1e1e', padding: 10, marginBottom: 20, borderRadius: 8 }}
      />

      <Button title="Cadastrar" onPress={handleCadastrar} color="#00adf5" />
    </View>
  );
}
