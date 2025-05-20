import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { Calendar } from 'react-native-calendars';
import { db } from '../../firebaseConfig';

export default function Agendamentos() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [marcacoes, setMarcacoes] = useState({});

  // Busca agendamentos no Firestore e monta as marcações
  const buscarAgendamentos = async () => {
    setLoading(true);
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
          };
        }
      });

      setMarcacoes(marcados);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    buscarAgendamentos();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    buscarAgendamentos().then(() => setRefreshing(false));
  };

  // Filtra agendamentos para o dia selecionado
  const agendamentosDoDia = dataSelecionada
    ? agendamentos.filter(item => item.data === dataSelecionada)
    : [];

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={day => setDataSelecionada(day.dateString)}
        markedDates={{
          ...marcacoes,
          ...(dataSelecionada ? {
            [dataSelecionada]: {
              ...(marcacoes[dataSelecionada] || {}),
              selected: true,
              selectedColor: '#00adf5',
            }
          } : {})
        }}
        theme={{
          calendarBackground: '#1e1e1e',
          dayTextColor: '#fff',
          monthTextColor: '#fff',
          arrowColor: '#fff',
          todayTextColor: '#00adf5',
        }}
      />

      {dataSelecionada && (
        <>
          <Text style={styles.titulo}>Agendamentos para {dataSelecionada}:</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#00adf5" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={agendamentosDoDia}
              keyExtractor={item => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
                  Nenhum agendamento para esta data.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cliente: {item.nomeCliente || item.cliente}</Text>
                  <Text style={{ color: '#ccc' }}>Hora: {item.hora}</Text>
                  <Text style={{ color: '#ccc' }}>Tatuador: {item.tatuadorNome || item.tatuador}</Text>
                  <Text style={{ color: '#ccc' }}>Email: {item.tatuadorEmail || item.email}</Text>
                  {item.preco && <Text style={{ color: '#ccc' }}>Preço: R${item.preco}</Text>}
                </View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  titulo: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginVertical: 12 },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
});
