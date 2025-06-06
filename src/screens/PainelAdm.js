import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { collection, getDocs, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { db } from '../../firebaseConfig';

import CadastrarTatuador from './CadastrarTatuador';
import CadastrarProduto from './CadastrarProduto'; // Importar o novo componente

// Configuração de localidade (mantida)
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan.','Fev.','Mar.','Abr.','Mai.','Jun.','Jul.','Ago.','Set.','Out.','Nov.','Dez.'],
  dayNames: ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
  dayNamesShort: ['Dom.','Seg.','Ter.','Qua.','Qui.','Sex.','Sáb.'],
  today: "Hoje"
};
LocaleConfig.defaultLocale = 'pt-br';


// 🔧 MOVER OS ESTILOS PARA CIMA AQUI
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitulo: { color: '#fff', fontSize: 16, marginBottom: 8, fontWeight: '500' },
  calendario: { borderRadius: 12, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, marginBottom: 16 },
  card: { backgroundColor: '#1e1e1e', padding: 14, marginBottom: 10, borderRadius: 12, borderColor: '#333', borderWidth: 1 },
  cardTitulo: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  cardTexto: { color: '#ccc', fontSize: 14, marginBottom: 2 },
  tabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#1e1e1e', borderRadius: 50, padding: 4, alignSelf: 'center' },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 50 },
  tabAtiva: { backgroundColor: '#00adf5' },
  tabTexto: { color: '#fff', fontSize: 16, fontWeight: '500' },
  botaoBloquear: { backgroundColor: '#d9534f', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 10 },
  botaoDesbloquear: { backgroundColor: '#5cb85c' },
  botaoBloquearTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  semAgendamentosTexto: { color: '#aaa', textAlign: 'center', marginTop: 10 },
  diaBloqueadoTexto: { color: '#ffc107', textAlign: 'center', marginTop: 20, fontSize: 16, fontWeight: 'bold' },
});

export default function PainelAdm({ navigation }){
  const [abaAtiva, setAbaAtiva] = useState('agenda');
  const [agendamentos, setAgendamentos] = useState([]);
  const [marcacoesAgendamentos, setMarcacoesAgendamentos] = useState({});
  const [diasBloqueados, setDiasBloqueados] = useState({});
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockingDay, setBlockingDay] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);


  const fetchData = useCallback(async () => {
    // ... (código fetchData mantido igual)
    setLoading(true);
    try {
      const agendamentosSnapshot = await getDocs(collection(db, 'agendamentos'));
      const agendamentosData = agendamentosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgendamentos(agendamentosData);
      const marcados = {};
      agendamentosData.forEach((item) => {
        if (item.data) {
          marcados[item.data] = { marked: true, dotColor: '#00adf5' };
        }
      });
      setMarcacoesAgendamentos(marcados);
      const bloqueadosSnapshot = await getDocs(collection(db, 'diasBloqueados'));
      const bloqueadosData = {};
      bloqueadosSnapshot.docs.forEach(doc => {
        const data = doc.data().data;
        if (data) {
          bloqueadosData[data] = {
            blocked: true, disabled: true, disableTouchEvent: true,
            customStyles: {
              container: { backgroundColor: '#555555', borderRadius: 5 },
              text: { color: '#aaaaaa', textDecorationLine: 'line-through' },
            },
          };
        }
      });
      setDiasBloqueados(bloqueadosData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do calendário.');
    } finally {
      setLoading(false);
    }
  }, []);

const buscarProdutos = async () => {
  setLoadingProdutos(true);
  try {
    const snapshot = await getDocs(collection(db, 'produtos'));
    const produtosData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    setProdutos(produtosData);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    Alert.alert('Erro', 'Não foi possível carregar os produtos.');
  } finally {
    setLoadingProdutos(false);
  }
};


useEffect(() => {
  fetchData();
}, [fetchData]);

useEffect(() => {
  if (abaAtiva === "cadastrarProduto") {
    buscarProdutos();
  }
}, [abaAtiva]);

  

  const combinedMarkedDates = { ...marcacoesAgendamentos };
  Object.keys(diasBloqueados).forEach(date => {
    combinedMarkedDates[date] = { ...(combinedMarkedDates[date] || {}), ...diasBloqueados[date] };
  });
  if (diaSelecionado) {
    combinedMarkedDates[diaSelecionado] = {
      ...(combinedMarkedDates[diaSelecionado] || {}),
      selected: true,
      selectedColor: diasBloqueados[diaSelecionado]?.blocked ? '#555555' : '#00adf5',
      selectedTextColor: '#ffffff',
      ...(diasBloqueados[diaSelecionado]?.blocked && { customStyles: diasBloqueados[diaSelecionado].customStyles })
    };
  }

  const agendamentosDoDia = diaSelecionado
    ? agendamentos.filter(item => item.data === diaSelecionado)
    : [];

  // Função handleBlockDay MODIFICADA PARA PULAR O ALERT
  const handleBlockDay = async () => {
    console.log("handleBlockDay (SEM ALERT): Função iniciada.");
    console.log("handleBlockDay (SEM ALERT): Dia selecionado:", diaSelecionado);

    if (!diaSelecionado) {
      console.log("handleBlockDay (SEM ALERT): Saindo porque diaSelecionado é nulo.");
      return;
    }

    const isBlocked = diasBloqueados[diaSelecionado]?.blocked;
    const actionText = isBlocked ? 'desbloquear' : 'bloquear';
    console.log(`handleBlockDay (SEM ALERT): Ação a ser realizada: ${actionText} o dia ${diaSelecionado}`);

    // ----- ALERT REMOVIDO PARA TESTE -----
    console.log("handleBlockDay (SEM ALERT): Pulando Alert. Iniciando operação...");

    setBlockingDay(true);
    console.log("handleBlockDay (SEM ALERT): blockingDay definido como true.");
    try {
      if (isBlocked) {
        console.log(`handleBlockDay (SEM ALERT): Tentando desbloquear ${diaSelecionado}...`);
        const q = query(collection(db, 'diasBloqueados'), where('data', '==', diaSelecionado));
        const querySnapshot = await getDocs(q);
        console.log(`handleBlockDay (SEM ALERT): Documentos encontrados para desbloqueio: ${querySnapshot.size}`);
        querySnapshot.forEach(async (doc) => {
          console.log(`handleBlockDay (SEM ALERT): Deletando documento ${doc.id}`);
          await deleteDoc(doc.ref);
          console.log(`handleBlockDay (SEM ALERT): Documento ${doc.id} deletado.`);
        });
        setDiasBloqueados(prev => {
          const newState = { ...prev };
          delete newState[diaSelecionado];
          console.log("handleBlockDay (SEM ALERT): Estado local atualizado (desbloqueado).");
          return newState;
        });
        // Usar um console.log em vez de Alert para feedback
        console.log(`SUCESSO: Dia ${diaSelecionado} desbloqueado.`);
        Alert.alert('Sucesso', `Dia ${diaSelecionado} desbloqueado.`); // Pode manter o Alert aqui, talvez funcione após a operação
      } else {
        console.log(`handleBlockDay (SEM ALERT): Tentando bloquear ${diaSelecionado}...`);
        const docRef = await addDoc(collection(db, 'diasBloqueados'), {
          data: diaSelecionado,
          motivo: 'Manutenção'
        });
        console.log(`handleBlockDay (SEM ALERT): Documento adicionado com ID: ${docRef.id}`);
        setDiasBloqueados(prev => {
          const newState = {
            ...prev,
            [diaSelecionado]: {
              blocked: true, disabled: true, disableTouchEvent: true,
              customStyles: {
                container: { backgroundColor: '#555555', borderRadius: 5 },
                text: { color: '#aaaaaa', textDecorationLine: 'line-through' },
              },
            }
          };
          console.log("handleBlockDay (SEM ALERT): Estado local atualizado (bloqueado).");
          return newState;
        });
        // Usar um console.log em vez de Alert para feedback
        console.log(`SUCESSO: Dia ${diaSelecionado} bloqueado para manutenção.`);
        Alert.alert('Sucesso', `Dia ${diaSelecionado} bloqueado para manutenção.`); // Pode manter o Alert aqui
      }
    } catch (error) {
      console.error(`handleBlockDay (SEM ALERT): Erro ao ${actionText} o dia:`, error);
      // Usar um console.error em vez de Alert para feedback de erro
      console.error(`ERRO: Não foi possível ${actionText} o dia ${diaSelecionado}. Detalhes:`, error);
      Alert.alert('Erro', `Não foi possível ${actionText} o dia ${diaSelecionado}.`); // Pode manter o Alert aqui
    } finally {
      console.log("handleBlockDay (SEM ALERT): Operação finalizada, definindo blockingDay como false.");
      setBlockingDay(false);
    }
  };


  // LOG DE TESTE: Para verificar se o componente renderiza e loga
  console.log("PainelAdm: Componente renderizado. Aba ativa:", abaAtiva, "Dia selecionado:", diaSelecionado);

return (
  <View style={styles.container}>
    {/* Tabs */}
    <View style={styles.tabs}>
      <TouchableOpacity
        onPress={() => setAbaAtiva('agenda')}
        style={[styles.tab, abaAtiva === 'agenda' && styles.tabAtiva]}
      >
        <Text style={styles.tabTexto}>Agenda</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setAbaAtiva("cadastrarTatuador")}
        style={[styles.tab, abaAtiva === "cadastrarTatuador" && styles.tabAtiva]}
      >
        <Text style={styles.tabTexto}>Cadastrar Tatuador</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setAbaAtiva("cadastrarProduto")}
        style={[styles.tab, abaAtiva === "cadastrarProduto" && styles.tabAtiva]}
      >
        <Text style={styles.tabTexto}>Cadastrar Produto</Text>
      </TouchableOpacity>
    </View> {/* 🔧 CORRIGIDO AQUI – Fechando a View das tabs corretamente */}

    {/* Conteúdo baseado na aba ativa */}
    {abaAtiva === "agenda" ? (
      <>
        {/* Aqui você pode colocar o calendário, agendamentos e botão de bloquear dia */}
        <Calendar
          markedDates={combinedMarkedDates}
          onDayPress={day => setDiaSelecionado(day.dateString)}
          markingType={'custom'}
          style={styles.calendario}
          theme={{
            backgroundColor: '#121212',
            calendarBackground: '#121212',
            dayTextColor: '#fff',
            monthTextColor: '#fff',
            arrowColor: '#00adf5',
            selectedDayBackgroundColor: '#00adf5',
          }}
        />

        {diaSelecionado && (
          <TouchableOpacity
            onPress={handleBlockDay}
            style={[
              styles.botaoBloquear,
              diasBloqueados[diaSelecionado]?.blocked && styles.botaoDesbloquear,
            ]}
            disabled={blockingDay}
          >
            <Text style={styles.botaoBloquearTexto}>
              {diasBloqueados[diaSelecionado]?.blocked ? 'Desbloquear Dia' : 'Bloquear Dia'}
            </Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#00adf5" />
        ) : agendamentosDoDia.length > 0 ? (
          <FlatList
            data={agendamentosDoDia}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitulo}>{item.nomeCliente}</Text>
                <Text style={styles.cardTexto}>Horário: {item.horario}</Text>
                <Text style={styles.cardTexto}>Tatuador: {item.tatuador}</Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.semAgendamentosTexto}>
            {diasBloqueados[diaSelecionado]?.blocked
              ? "Dia bloqueado para agendamentos."
              : "Nenhum agendamento para o dia selecionado."}
          </Text>
        )}
      </>
    ) : abaAtiva === "cadastrarTatuador" ? (
      <CadastrarTatuador />
    ) : (
<View style={{ flex: 1 }}>
  <CadastrarProduto />
  <Text style={[styles.titulo, { marginTop: 20 }]}>Produtos Cadastrados</Text>
  {loadingProdutos ? (
    <ActivityIndicator size="large" color="#00adf5" />
  ) : (
    <FlatList
      contentContainerStyle={{ paddingBottom: 80 }}
      data={produtos}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>{item.nome}</Text>
          <Text style={styles.cardTexto}>Preço: R$ {item.preco}</Text>
          <Text style={styles.cardTexto}>Descrição: {item.descricao}</Text>
        </View>
      )}
    />
  )}
</View>


    )}
  </View>
)};
