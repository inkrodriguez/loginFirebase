import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Image, Alert, Text } from "react-native";
import { useNavigation } from '@react-navigation/native';
import styles from "./style";

import { auth } from "../../firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

export default function FormLogin() {
  const navigation = useNavigation();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!login || !password) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, login, password);
      const user = userCredential.user;
      console.log("Usuário logado:", user.email);
      Alert.alert("Sucesso", `Bem-vindo, ${user.email}`);
      
      if (user.email === "admin@estudioshodo.com") {
        navigation.replace("PainelAdm");
      } else {
        navigation.replace("Home");
      }

    } catch (error) {
      console.log("Erro ao logar:", error.message);
      Alert.alert("Erro ao logar", error.message);
    }
  };

  const handleRegister = async () => {
    if (!login || !password) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, login, password);
      const user = userCredential.user;
      console.log("Usuário cadastrado:", user.email);
      Alert.alert("Sucesso", `Conta criada: ${user.email}`);
    } catch (error) {
      console.log("Erro ao cadastrar:", error.message);
      Alert.alert("Erro ao cadastrar", error.message);
    }
  };

  return (
    <View style={styles.boxLogin}>
      <Image
        source={require("../../assets/logo2.png")}
        style={styles.logo}
      />
      <TextInput
        style={styles.input}
        placeholder="User"
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
        placeholderTextColor="#888" 
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
        placeholderTextColor="#888" 
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.textButton}>Entrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.textButton}>Cadastre-se</Text>
        </TouchableOpacity> 
      </View>

      {/* Botão para ir para Loja */}
      <TouchableOpacity
        style={[styles.buttonLoja, { marginTop: 20, backgroundColor: '#444' }]}
        onPress={() => navigation.navigate('Loja')}
      >
        <Text style={styles.textButton}>Ir para Loja</Text>
      </TouchableOpacity>
    </View>
  );
}
