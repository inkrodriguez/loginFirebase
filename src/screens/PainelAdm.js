// src/screens/PainelAdm.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, StyleSheet, Button } from 'react-native';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { Calendar } from 'react-native-calendars';
import { db } from '../../firebaseConfig';

export default function PainelAdm() {
  const [abaAtiva, setAbaAtiva] = useState('agenda');
  const [agendamentos, setAgendamentos] = useState([]);
  const [marcacoes, setMarcacoes] = useState({});
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  // Cadastro de tatuador
  const [email, setEmail] = useState('');
  const [plano, setPlano] = useState('');
  const [tatuadores, setTatuadores] = useState([]);

  useEffect(() => {
    const fetchAgendamentos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'agendamentos'));
        const dados = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgendamentos(dados);

        const marcados = {};
        dados.forEach((item) => {
          if (item.data) {
            marcados[item.data] = {
              marked: true,
              dotColor: '#00adf5',
              selectedColor: '#333',
            };
          }
        });

        setMarcacoes(marcados);
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
      }
    };

    const fetchTatuadores = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'tatuadores'));
        const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTatuadores(lista);
      } catch (error) {
        console.error('Erro ao buscar tatuadores:', error);
      }
    };

    fetchAgendamentos();
    fetchTatuadores();
  }, []);

  const handleCadastrarTatuador = async () => {
    if (!email || !plano) {
      Alert.alert('Erro', 'Preencha todos os campos!');
      return;
    }

    try {
      await addDoc(collection(db, 'tatuadores'), {
        email,
        plano
      });
      setEmail('');
      setPlano('');
      Alert.alert('Sucesso', 'Tatuador cadastrado com sucesso!');
      const snapshot = await getDocs(collection(db, 'tatuadores'));
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTatuadores(lista);
    } catch (error) {
      console.error('Erro ao cadastrar tatuador:', error);
      Alert.alert('Erro ao cadastrar tatuador');
    }
  };

  const agendamentosDoDia = diaSelecionado
    ? agendamentos.filter(item => item.data === diaSelecionado)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: '#121212', padding: 16 }}>
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setAbaAtiva('agenda')} style={[styles.tab, abaAtiva === 'agenda' && styles.tabAtiva]}>
          <Text style={styles.tabTexto}>Agenda</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAbaAtiva('cadastrar')} style={[styles.tab, abaAtiva === 'cadastrar' && styles.tabAtiva]}>
          <Text style={styles.tabTexto}>Cadastrar Tatuador</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'agenda' ? (
        <>
          <Text style={styles.titulo}>Painel do Administrador</Text>

          <Calendar
            onDayPress={day => setDiaSelecionado(day.dateString)}
            markedDates={{
              ...marcacoes,
              [diaSelecionado]: {
                ...(marcacoes[diaSelecionado] || {}),
                selected: true,
                selectedColor: '#00adf5',
              },
            }}
            theme={{
              calendarBackground: '#1e1e1e',
              dayTextColor: '#fff',
              monthTextColor: '#fff',
              arrowColor: '#fff',
              todayTextColor: '#00adf5',
            }}
          />

          {diaSelecionado && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>
                Agendamentos para {diaSelecionado}:
              </Text>

              <FlatList
                data={agendamentosDoDia}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cliente: {item.nomeCliente}</Text>
                    <Text style={{ color: '#ccc' }}>Hora: {item.hora}</Text>
                    <Text style={{ color: '#ccc' }}>Tatuador: {item.tatuadorNome}</Text>
                    <Text style={{ color: '#ccc' }}>Email: {item.tatuadorEmail}</Text>
                    {item.preco && <Text style={{ color: '#ccc' }}>Preço: R${item.preco}</Text>}
                  </View>
                )}
              />
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.titulo}>Cadastrar Tatuador</Text>
          <TextInput placeholder="Email" placeholderTextColor="#888" value={email} onChangeText={setEmail} style={styles.input} />
          <TextInput placeholder="Plano" placeholderTextColor="#888" value={plano} onChangeText={setPlano} style={styles.input} />
          <Button title="Cadastrar" onPress={handleCadastrarTatuador} />

          <Text style={[styles.titulo, { marginTop: 24 }]}>Tatuadores Cadastrados</Text>
          <FlatList
            data={tatuadores}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.nome}</Text>
                <Text style={{ color: '#ccc' }}>{item.email}</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabAtiva: {
    borderBottomColor: '#00adf5',
  },
  tabTexto: {
    color: '#fff',
    fontSize: 16,
  },
});
