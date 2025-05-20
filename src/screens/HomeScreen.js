import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Button,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { Calendar } from 'react-native-calendars';
import { db } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';

export default function Agendamentos() {
  const auth = getAuth();
  const usuarioLogado = auth.currentUser;
  const tatuadorEmail = usuarioLogado?.email?.toLowerCase() || '';

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [marcacoes, setMarcacoes] = useState({});

  const [modalVisible, setModalVisible] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState(null);
  const [preco, setPreco] = useState('');

  const horariosDisponiveis = [
    '07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00',
  ];

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

  const agendamentosDoDia = dataSelecionada
    ? agendamentos.filter(item => item.data === dataSelecionada)
    : [];

  const tatuadoresUnicosDoDia = Array.from(
    new Set(
      agendamentosDoDia
        .map(a => (typeof a.tatuador === 'string' ? a.tatuador.toLowerCase() : null))
        .filter(email => email)
    )
  );

  const limiteAtingido =
    tatuadoresUnicosDoDia.length >= 4 &&
    !tatuadoresUnicosDoDia.includes(tatuadorEmail);

  const abrirModal = () => setModalVisible(true);
  const fecharModal = () => {
    setNomeCliente('');
    setHoraSelecionada(null);
    setPreco('');
    setModalVisible(false);
  };

  const confirmarAgendamento = async () => {
    if (!nomeCliente.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (!horaSelecionada) {
      alert('Por favor, selecione um horário.');
      return;
    }

    const precoNumero = parseFloat(preco.replace(',', '.'));
    if (isNaN(precoNumero) || precoNumero < 0) {
      alert('Informe um preço válido (0 ou mais).');
      return;
    }

    try {
      await addDoc(collection(db, 'agendamentos'), {
        data: dataSelecionada,
        hora: horaSelecionada,
        nomeCliente: nomeCliente.trim(),
        preco: precoNumero,
        finalizado: false,
        criadoEm: new Date(),
        tatuador: tatuadorEmail,
      });

      alert('Agendamento confirmado!');
      fecharModal();
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Não foi possível agendar. Tente novamente.');
    }
  };

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
        <View style={{ marginTop: 12 }}>
          {limiteAtingido ? (
            <Text style={{ color: '#c0392b', fontWeight: 'bold', textAlign: 'center' }}>
              Limite de Agendamentos Atingido para esta data.
            </Text>
          ) : (
            <Button title="Agendar Cliente" color="#27ae60" onPress={abrirModal} />
          )}
        </View>
      )}

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
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cliente: {item.nomeCliente}</Text>
                  <Text style={{ color: '#ccc' }}>Hora: {item.hora}</Text>
                  {item.preco !== undefined && <Text style={{ color: '#ccc' }}>Preço: R${item.preco}</Text>}
                </View>
              )}
            />
          )}
        </>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={fecharModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirmar Agendamento</Text>

            <Text style={styles.label}>Data:</Text>
            <Text style={styles.dataTexto}>{dataSelecionada}</Text>

            <Text style={styles.label}>Nome do Cliente:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o nome do cliente"
              value={nomeCliente}
              onChangeText={setNomeCliente}
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Preço (R$):</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o preço"
              value={preco}
              onChangeText={setPreco}
              keyboardType="decimal-pad"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Escolha um horário:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
              contentContainerStyle={{ paddingHorizontal: 5 }}
            >
              {horariosDisponiveis.map((hora) => (
                <TouchableOpacity
                  key={hora}
                  style={[
                    styles.horaBotao,
                    horaSelecionada === hora && styles.horaBotaoSelecionado,
                  ]}
                  onPress={() => setHoraSelecionada(hora)}
                >
                  <Text style={{ color: horaSelecionada === hora ? '#fff' : '#000' }}>{hora}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' }}>
              <Button title="Cancelar" onPress={fecharModal} color="#c0392b" />
              <Button title="Confirmar" onPress={confirmarAgendamento} color="#27ae60" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  titulo: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginVertical: 12 },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  label: {
    color: '#ccc',
    marginTop: 10,
    fontWeight: '600',
  },
  dataTexto: {
    color: '#fff',
    fontSize: 16,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 6,
    padding: 10,
    color: '#fff',
    marginTop: 6,
  },
  horaBotao: {
    backgroundColor: '#eee',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  horaBotaoSelecionado: {
    backgroundColor: '#00adf5',
  },
});
