import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, RefreshControl, ActivityIndicator,
  StyleSheet, Button, Modal, TextInput, TouchableOpacity,
  ScrollView, StatusBar, Platform, Alert
} from 'react-native';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
// Importar LocaleConfig junto com Calendar
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { db } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';
import Icon from 'react-native-vector-icons/FontAwesome';
import TopBar from './Agendamentos/Topbar'; // ajuste o caminho conforme sua estrutura de pastas

import CardAgendamentos from './Agendamentos/CardAgendamentos';


// Configuração de localidade para o calendário (Português)
LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ],
  monthNamesShort: ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'],
  dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  dayNamesShort: ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'],
  today: "Hoje"
};
LocaleConfig.defaultLocale = 'pt-br';

// Configuração de vagas por horário
const VAGAS_POR_HORARIO = 4; // Máximo de tatuadores simultâneos por horário
const VAGAS_PLANOS_RESTRITOS = 1; // Máximo de tatuadores com planos restritos por horário

export default function Agendamentos() {
  const auth = getAuth();
  const usuarioLogado = auth.currentUser;
  const tatuadorEmail = usuarioLogado?.email?.toLowerCase() || '';


const [activeTab, setActiveTab] = useState('agendamento');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [marcacoes, setMarcacoes] = useState({});
  const [tatuadores, setTatuadores] = useState([]);
  const [planoTatuador, setPlanoTatuador] = useState('');
  const [limiteAgendamentosMensais, setLimiteAgendamentosMensais] = useState(0);
  const [verificandoLimite, setVerificandoLimite] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');
  const [horarioInicio, setHorarioInicio] = useState(null);
  const [horarioFim, setHorarioFim] = useState(null);
  const [preco, setPreco] = useState('');
  
  // Estado para controlar se o alerta de pagamento já foi exibido
  const [alertaPagamentoExibido, setAlertaPagamentoExibido] = useState(false);

  // Estado para contagem de agendamentos no mês atual
  const [agendamentosMesAtual, setAgendamentosMesAtual] = useState(0);

  // *** ESTADO PARA DIAS BLOQUEADOS ***
  const [diasBloqueados, setDiasBloqueados] = useState({});

  const horariosDisponiveis = [
    '07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00',
  ];

  // Função para obter o nome do tatuador a partir do email
  const obterNomeTatuador = (email) => {
    const tatuador = tatuadores.find(t => t.email?.toLowerCase() === email?.toLowerCase());
    return tatuador ? tatuador.nome : email;
  };

  // Função para verificar se o plano é restrito (Convidado ou Flexível)
  const ehPlanoRestrito = (plano) => {
    return plano === 'Convidado' || plano === 'Flexivel' || plano === 'Porcentagem';
  };

  // Função para verificar se já existe outro tatuador com plano restrito na data
  const existeOutroTatuadorComPlanoRestrito = (data) => {
    if (!data) return false;
    
    // Se meu plano não é restrito, não preciso verificar
    if (!ehPlanoRestrito(planoTatuador)) return false;
    
    // Filtrar agendamentos da data selecionada
    const agendamentosDaData = agendamentos.filter(item => item.data === data);
    
    // Obter emails únicos de tatuadores nesta data (exceto eu mesmo)
    const emailsTatuadoresNaData = Array.from(
      new Set(
        agendamentosDaData
          .map(a => (typeof a.tatuador === 'string' ? a.tatuador.toLowerCase() : null))
          .filter(email => email && email !== tatuadorEmail)
      )
    );
    
    // Verificar se algum desses tatuadores tem plano restrito
    for (const email of emailsTatuadoresNaData) {
      const tatuador = tatuadores.find(t => t.email?.toLowerCase() === email);
      if (tatuador && ehPlanoRestrito(tatuador.plano)) {
        return true;
      }
    }
    
    return false;
  };

  // Função para converter horário string para minutos desde meia-noite
  const horarioParaMinutos = (horario) => {
    if (!horario) return 0;
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
  };

  // Função para verificar se dois intervalos de horário se sobrepõem
  const horariosSeSobrepoe = (inicio1, fim1, inicio2, fim2) => {
    const inicio1Min = horarioParaMinutos(inicio1);
    const fim1Min = horarioParaMinutos(fim1);
    const inicio2Min = horarioParaMinutos(inicio2);
    const fim2Min = horarioParaMinutos(fim2);
    
    return (inicio1Min < fim2Min && fim1Min > inicio2Min);
  };

  // Função para contar quantos tatuadores estão agendados em um determinado horário
  const contarTatuadoresPorHorario = (data, horarioInicio, horarioFim) => {
    if (!data || !horarioInicio || !horarioFim) return 0;
    
    // Filtrar agendamentos da data selecionada
    const agendamentosDaData = agendamentos.filter(item => item.data === data);
    
    // Contar tatuadores únicos cujos horários se sobrepõem ao horário selecionado
    const tatuadoresNoHorario = new Set();
    
    agendamentosDaData.forEach(agendamento => {
      const inicio = agendamento.horarioInicio || agendamento.hora; // Compatibilidade com dados antigos
      const fim = agendamento.horarioFim || agendamento.hora;       // Compatibilidade com dados antigos
      
      if (horariosSeSobrepoe(horarioInicio, horarioFim, inicio, fim)) {
        tatuadoresNoHorario.add(agendamento.tatuador?.toLowerCase());
      }
    });
    
    return tatuadoresNoHorario.size;
  };

  // Função para contar quantos tatuadores com planos restritos estão agendados em um determinado horário
  const contarTatuadoresRestritosPorHorario = (data, horarioInicio, horarioFim) => {
    if (!data || !horarioInicio || !horarioFim) return 0;
    
    // Filtrar agendamentos da data selecionada
    const agendamentosDaData = agendamentos.filter(item => item.data === data);
    
    // Contar tatuadores únicos com planos restritos cujos horários se sobrepõem ao horário selecionado
    const tatuadoresRestritosNoHorario = new Set();
    
    agendamentosDaData.forEach(agendamento => {
      const inicio = agendamento.horarioInicio || agendamento.hora; // Compatibilidade com dados antigos
      const fim = agendamento.horarioFim || agendamento.hora;       // Compatibilidade com dados antigos
      
      if (horariosSeSobrepoe(horarioInicio, horarioFim, inicio, fim)) {
        const email = agendamento.tatuador?.toLowerCase();
        const tatuador = tatuadores.find(t => t.email?.toLowerCase() === email);
        
        if (tatuador && ehPlanoRestrito(tatuador.plano)) {
          tatuadoresRestritosNoHorario.add(email);
        }
      }
    });
    
    return tatuadoresRestritosNoHorario.size;
  };

  // Função para verificar se um horário está disponível para agendamento
  const horarioDisponivel = (horarioInicio, horarioFim) => {
    if (!dataSelecionada || !horarioInicio || !horarioFim) return false;
    
    // Verificar se o horário já está ocupado pelo próprio tatuador
    const meusAgendamentos = agendamentos.filter(
      item => item.data === dataSelecionada && item.tatuador?.toLowerCase() === tatuadorEmail
    );
    
    for (const agendamento of meusAgendamentos) {
      const inicio = agendamento.horarioInicio || agendamento.hora; // Compatibilidade com dados antigos
      const fim = agendamento.horarioFim || agendamento.hora;       // Compatibilidade com dados antigos
      
      if (horariosSeSobrepoe(horarioInicio, horarioFim, inicio, fim)) {
        return false; // Horário já ocupado pelo próprio tatuador
      }
    }
    
    // Contar tatuadores no horário
    const tatuadoresNoHorario = contarTatuadoresPorHorario(dataSelecionada, horarioInicio, horarioFim);
    
    // Verificar limite geral de vagas
    if (tatuadoresNoHorario >= VAGAS_POR_HORARIO) {
      return false; // Limite geral de vagas atingido
    }
    
    // Se for um plano restrito, verificar limite específico
    if (ehPlanoRestrito(planoTatuador)) {
      const tatuadoresRestritosNoHorario = contarTatuadoresRestritosPorHorario(dataSelecionada, horarioInicio, horarioFim);
      
      if (tatuadoresRestritosNoHorario >= VAGAS_PLANOS_RESTRITOS) {
        return false; // Limite de vagas para planos restritos atingido
      }
    }
    
    return true; // Horário disponível
  };

  const buscarPlanoTatuador = async () => {
    if (!tatuadorEmail) return;
    
    try {
      const tatuadoresRef = collection(db, 'tatuadores');
      const q = query(tatuadoresRef, where('email', '==', tatuadorEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const tatuadorData = querySnapshot.docs[0].data();
        setPlanoTatuador(tatuadorData.plano || 'Básico');
        
        // Armazenar o limite de agendamentos mensais
        const limite = tatuadorData.limiteAgendamentosMensais || 0;
        setLimiteAgendamentosMensais(limite);
      } else {
        setPlanoTatuador('Não encontrado');
        console.log('Tatuador não encontrado na coleção');
      }
    } catch (error) {
      console.error('Erro ao buscar plano do tatuador:', error);
      setPlanoTatuador('Erro');
    }
  };

  const buscarTatuadores = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'tatuadores'));
      const dados = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTatuadores(dados);
    } catch (error) {
      console.error('Erro ao buscar tatuadores:', error);
    }
  };

  // *** NOVA FUNÇÃO PARA BUSCAR DIAS BLOQUEADOS ***
  const buscarDiasBloqueados = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'diasBloqueados'));
      const diasBloqueadosObj = {};
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Assumindo que cada documento tem um campo 'data' com a data no formato YYYY-MM-DD
        if (data.data) {
          diasBloqueadosObj[data.data] = {
            disabled: true,
            disableTouchEvent: true,
            textColor: '#666',
            backgroundColor: '#333',
            // Adicionar informações adicionais se necessário
            motivo: data.motivo || 'Dia bloqueado',
            ...data // Incluir outros campos do documento
          };
        }
      });
      
      setDiasBloqueados(diasBloqueadosObj);
    } catch (error) {
      console.error('Erro ao buscar dias bloqueados:', error);
    }
  };

  const buscarAgendamentos = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'agendamentos'));
      const dados = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgendamentos(dados);

      const marcados = {};
      dados.forEach((item) => {
        if (item.data && item.tatuador?.toLowerCase() === tatuadorEmail) {
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

  const removerAgendamento = async (id) => {
    try {
      await deleteDoc(doc(db, 'agendamentos', id));
      buscarAgendamentos();
      alert('Agendamento removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover agendamento:', error);
      alert('Não foi possível remover o agendamento.');
    }
  };

  // NOVA FUNÇÃO pra confirmar atendimento (atualiza campo finalizado)
  const confirmarAtendimento = async (id) => {
    try {
      const agendamentoRef = doc(db, 'agendamentos', id);
      await updateDoc(agendamentoRef, { 
        finalizado: true,
        clienteFaltou: false // Garantir que não está marcado como falta
      });
      alert('Atendimento confirmado!');
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao confirmar atendimento:', error);
      alert('Não foi possível confirmar o atendimento.');
    }
  };

  // NOVA FUNÇÃO para registrar que o cliente faltou
  const registrarClienteFaltou = async (id) => {
    try {
      const agendamentoRef = doc(db, 'agendamentos', id);
      await updateDoc(agendamentoRef, { 
        finalizado: false, // Não finalizado
        clienteFaltou: true // Marcado como falta
      });
      alert('Falta do cliente registrada!');
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao registrar falta do cliente:', error);
      alert('Não foi possível registrar a falta do cliente.');
    }
  };

  useEffect(() => {
    buscarTatuadores();
    buscarAgendamentos();
    buscarPlanoTatuador();
    buscarDiasBloqueados(); // *** ADICIONANDO BUSCA DE DIAS BLOQUEADOS ***
  }, []);

  // Efeito para calcular agendamentos do mês atual
  useEffect(() => {
    if (agendamentos.length > 0 && tatuadorEmail) {
      const hoje = new Date();
      const mesAtual = hoje.getMonth(); // 0-11
      const anoAtual = hoje.getFullYear();

      const contagem = agendamentos.filter(item => {
        if (item.tatuador?.toLowerCase() !== tatuadorEmail || !item.data) {
          return false;
        }
        try {
          const dataAgendamento = new Date(item.data + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso
          return dataAgendamento.getMonth() === mesAtual && dataAgendamento.getFullYear() === anoAtual;
        } catch (e) {
          console.error("Erro ao parsear data do agendamento:", item.data, e);
          return false;
        }
      }).length;

      setAgendamentosMesAtual(contagem);
    }
  }, [agendamentos, tatuadorEmail]); // Recalcular quando agendamentos ou email mudarem

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      buscarTatuadores(), 
      buscarAgendamentos(), 
      buscarPlanoTatuador(),
      buscarDiasBloqueados() // *** ADICIONANDO BUSCA DE DIAS BLOQUEADOS NO REFRESH ***
    ]).then(() => setRefreshing(false));
  };

  const agendamentosDoDia = dataSelecionada
    ? agendamentos.filter(item => item.data === dataSelecionada)
    : [];

  // Função para agrupar agendamentos por tatuador (apenas para outros tatuadores)
  const agruparAgendamentosPorTatuador = (agendamentos) => {
    // Separar agendamentos do usuário logado e de outros tatuadores
    const meusAgendamentos = [];
    const outrosAgendamentos = [];
    
    agendamentos.forEach(item => {
      if (item.tatuador?.toLowerCase() === tatuadorEmail) {
        // Meus agendamentos ficam separados (um card por horário)
        meusAgendamentos.push({
          ...item,
          // Adicionar campo horarios para compatibilidade com o componente CardAgendamentos
          horarios: [{ 
            hora: item.horarioInicio || item.hora, 
            horaFim: item.horarioFim || item.hora,
            id: item.id 
          }]
        });
      } else {
        // Agendamentos de outros tatuadores serão agrupados
        outrosAgendamentos.push(item);
      }
    });
    
    // Agrupar agendamentos de outros tatuadores
    const agrupados = {};
    
    outrosAgendamentos.forEach(item => {
      // Criar chave única para cada tatuador
      const chave = item.tatuador?.toLowerCase() || 'sem-tatuador';
      
      if (!agrupados[chave]) {
        // Criar o primeiro item para este tatuador
        agrupados[chave] = {
          ...item,
          horarios: [{ 
            hora: item.horarioInicio || item.hora, 
            horaFim: item.horarioFim || item.hora,
            id: item.id 
          }],
          ids: [item.id],
          // Usamos o primeiro ID como ID principal do grupo
          id: item.id
        };
      } else {
        // Adicionar horário ao tatuador existente
        agrupados[chave].horarios.push({ 
          hora: item.horarioInicio || item.hora, 
          horaFim: item.horarioFim || item.hora,
          id: item.id 
        });
        agrupados[chave].ids.push(item.id);
      }
    });
    
    // Combinar meus agendamentos (não agrupados) com os outros agendamentos (agrupados)
    return [...meusAgendamentos, ...Object.values(agrupados)];
  };

  // Agrupamos os agendamentos por tatuador (apenas para outros tatuadores)
  const agendamentosProcessados = agruparAgendamentosPorTatuador(agendamentosDoDia);
  
  // Ordenamos os agendamentos
  const agendamentosOrdenados = [...agendamentosProcessados].sort((a, b) => {
    const aEhMeu = a.tatuador?.toLowerCase() === tatuadorEmail;
    const bEhMeu = b.tatuador?.toLowerCase() === tatuadorEmail;

    // Meus agendamentos sempre aparecem primeiro
    if (aEhMeu && !bEhMeu) return -1;
    if (!aEhMeu && bEhMeu) return 1;

    // Se ambos são meus agendamentos, ordenar por hora
    if (aEhMeu && bEhMeu) {
      const horaA = parseInt((a.horarioInicio || a.hora).replace(':', ''), 10);
      const horaB = parseInt((b.horarioInicio || b.hora).replace(':', ''), 10);
      return horaA - horaB;
    }
    
    // Se ambos são de outros tatuadores, ordenar pelo nome do tatuador
    const nomeA = obterNomeTatuador(a.tatuador);
    const nomeB = obterNomeTatuador(b.tatuador);
    return nomeA.localeCompare(nomeB);
  });

  // Verificar se há restrição de plano para a data selecionada
  const restricaoPlanoAtingida = dataSelecionada ? 
    existeOutroTatuadorComPlanoRestrito(dataSelecionada) : false;

  const abrirModal = () => {
    // *** VERIFICAR SE O DIA ESTÁ BLOQUEADO ***
    if (dataSelecionada && diasBloqueados[dataSelecionada]) {
      const motivo = diasBloqueados[dataSelecionada].motivo || 'Este dia está bloqueado para agendamentos.';
      alert(motivo);
      return;
    }
    
    // Verificar restrição de plano (Convidado ou Flexível)
    if (ehPlanoRestrito(planoTatuador) && restricaoPlanoAtingida) {
      alert(`Não é possível agendar nesta data, seu plano contém restrições quando há tatuadores com o mesmo plano agendados no mesmo dia.`);
      return;
    }
    
    // Resetar o estado do alerta de pagamento
    setAlertaPagamentoExibido(false);
    setHorarioInicio(null);
    setHorarioFim(null);
    setModalVisible(true);
  };

  const fecharModal = () => {
    setNomeCliente('');
    setHorarioInicio(null);
    setHorarioFim(null);
    setPreco('');
    setModalVisible(false);
    setAlertaPagamentoExibido(false);
  };

  const confirmarAgendamento = async () => {
    if (!nomeCliente.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (!horarioInicio) {
      alert('Por favor, selecione um horário de início.');
      return;
    }
    if (!horarioFim) {
      alert('Por favor, selecione um horário de fim.');
      return;
    }
    
    // Verificar se o horário de fim é posterior ao horário de início
    if (horarioParaMinutos(horarioInicio) >= horarioParaMinutos(horarioFim)) {
      alert('O horário de fim deve ser posterior ao horário de início.');
      return;
    }

    const precoNumero = parseFloat(preco.replace(',', '.'));
    if (isNaN(precoNumero) || precoNumero < 0) {
      alert('Informe um preço válido (0 ou mais).');
      return;
    }

    // Verificar novamente a restrição de plano antes de confirmar o agendamento
    if (ehPlanoRestrito(planoTatuador) && restricaoPlanoAtingida) {
      alert(`Não é possível agendar nesta data, seu plano contém restrições quando há tatuadores com o mesmo plano agendados no mesmo dia.`);
      return;
    }
    
    // Verificar disponibilidade de vagas para o horário selecionado
    if (!horarioDisponivel(horarioInicio, horarioFim)) {
      alert('Não há vagas disponíveis para o horário selecionado. Por favor, escolha outro horário.');
      return;
    }

    // Verificar se o plano requer alerta de pagamento e se o alerta ainda não foi exibido
    if (planoRequerAlertaPagamento() && !alertaPagamentoExibido) {
      setAlertaPagamentoExibido(true);
      
      // Exibir alerta específico conforme o plano
      if (planoTatuador === 'Porcentagem') {
        Alert.alert(
          "Atenção - Pagamento Necessário",
          "Seu plano é Porcentagem. Antes de finalizar o agendamento, você deve enviar imediatamente o valor da porcentagem digitada.",
          [
            { 
              text: "Cancelar", 
              style: "cancel",
              onPress: () => setAlertaPagamentoExibido(false)
            },
            { 
              text: "Já enviei o pagamento", 
              onPress: () => salvarAgendamento(precoNumero)
            }
          ]
        );
      } else if (planoTatuador === 'Convidado') {
        Alert.alert(
          "Atenção - Pagamento Necessário",
          "Seu plano é Convidado. Antes de finalizar o agendamento, você deve enviar imediatamente o valor da diária de R$100,00.",
          [
            { 
              text: "Cancelar", 
              style: "cancel",
              onPress: () => setAlertaPagamentoExibido(false)
            },
            { 
              text: "Já enviei o pagamento", 
              onPress: () => salvarAgendamento(precoNumero)
            }
          ]
        );
      }
      
      return;
    }

    // Se não requer alerta ou o alerta já foi exibido e confirmado, prosseguir com o agendamento
    salvarAgendamento(precoNumero);
  };

  // Função para salvar o agendamento no Firestore
  const salvarAgendamento = async (precoNumero) => {
    try {
      await addDoc(collection(db, 'agendamentos'), {
        data: dataSelecionada,
        hora: horarioInicio, // Mantido para compatibilidade
        horarioInicio: horarioInicio,
        horarioFim: horarioFim,
        nomeCliente: nomeCliente.trim(),
        preco: precoNumero,
        finalizado: false,
        clienteFaltou: false,
        criadoEm: new Date(),
        tatuador: tatuadorEmail,
        pagamentoConfirmado: planoRequerAlertaPagamento()
      });

      alert('Agendamento confirmado!');
      fecharModal();
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Não foi possível agendar. Tente novamente.');
    }
  };

  const agendamentoJaPassou = (item) => {
    if (!item.data) return false;
    
    // Se for um agendamento agrupado (de outro tatuador)
    if (item.horarios && item.horarios.length > 0) {
      // Verificar o último horário
      const ultimoHorario = [...item.horarios].sort((a, b) => {
        const horaA = parseInt((a.horaFim || a.hora).replace(':', ''), 10);
        const horaB = parseInt((b.horaFim || b.hora).replace(':', ''), 10);
        return horaB - horaA; // Ordem decrescente para pegar o último
      })[0];
      
      const horarioFinal = ultimoHorario.horaFim || ultimoHorario.hora;
      const [hora, minuto] = horarioFinal.split(':').map(Number);
      const dataHoraAgendada = new Date(`${item.data}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`);
      return dataHoraAgendada < new Date();
    } 
    // Se for um agendamento individual (meu)
    else {
      const horarioFinal = item.horarioFim || item.hora;
      const [hora, minuto] = horarioFinal.split(':').map(Number);
      const dataHoraAgendada = new Date(`${item.data}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`);
      return dataHoraAgendada < new Date();
    }
  };

  // Verificar se o plano requer alerta de pagamento
  const planoRequerAlertaPagamento = () => {
    return planoTatuador === 'Porcentagem' || planoTatuador === 'Convidado';
  };

  // Calcular ocupação de vagas por horário para o dia selecionado
  const calcularOcupacaoVagas = () => {
    if (!dataSelecionada) return {};
    
    const ocupacao = {};
    
    // Inicializar todos os horários disponíveis com 0 ocupação
    horariosDisponiveis.forEach(hora => {
      ocupacao[hora] = {
        total: 0,
        restritos: 0
      };
    });
    
    // Contar ocupação para cada horário
    agendamentosDoDia.forEach(agendamento => {
      const inicio = agendamento.horarioInicio || agendamento.hora;
      const fim = agendamento.horarioFim || agendamento.hora;
      const inicioIdx = horariosDisponiveis.indexOf(inicio);
      const fimIdx = horariosDisponiveis.indexOf(fim);
      
      // Se os horários não estão na lista, pular
      if (inicioIdx === -1 || fimIdx === -1) return;
      
      // Verificar se o tatuador tem plano restrito
      const email = agendamento.tatuador?.toLowerCase();
      const tatuador = tatuadores.find(t => t.email?.toLowerCase() === email);
      const ehRestrito = tatuador && ehPlanoRestrito(tatuador.plano);
      
      // Incrementar ocupação para cada horário no intervalo
      for (let i = inicioIdx; i < fimIdx; i++) {
        const hora = horariosDisponiveis[i];
        ocupacao[hora].total += 1;
        
        if (ehRestrito) {
          ocupacao[hora].restritos += 1;
        }
      }
    });
    
    return ocupacao;
  };

  const ocupacaoVagas = calcularOcupacaoVagas();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <TopBar 
        planoTatuador={planoTatuador} 
        agendamentosMesAtual={agendamentosMesAtual}
        limiteAgendamentosMensais={limiteAgendamentosMensais}
      />

      {/* Alerta para planos que exigem pagamento */}
      {planoRequerAlertaPagamento() && (
        <View style={styles.alertaPagamentoContainer}>
          <Text style={styles.alertaPagamentoTexto}>
            {planoTatuador === 'Porcentagem' 
              ? 'Seu plano exige o envio da porcentagem antes de finalizar o agendamento.'
              : 'Seu plano exige o envio da diária de R$100,00 antes de finalizar o agendamento.'}
          </Text>
        </View>
      )}

      {/* Indicador de ocupação de vagas por horário - Acima do calendário */}
      {dataSelecionada && Object.keys(ocupacaoVagas).length > 0 && (
        <View style={styles.ocupacaoContainer}>
          <Text style={styles.ocupacaoTitulo}>Ocupação de vagas por horário:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ocupacaoScroll}>
            {horariosDisponiveis.map(hora => {
              const ocupacao = ocupacaoVagas[hora] || { total: 0, restritos: 0 };
              const porcentagemTotal = (ocupacao.total / VAGAS_POR_HORARIO) * 100;
              const porcentagemRestritos = (ocupacao.restritos / VAGAS_PLANOS_RESTRITOS) * 100;
              
              return (
                <View key={hora} style={styles.ocupacaoItem}>
                  <Text style={styles.ocupacaoHora}>{hora}</Text>
                  <View style={styles.ocupacaoBarraContainer}>
                    <View 
                      style={[
                        styles.ocupacaoBarra, 
                        {
                          backgroundColor: porcentagemTotal >= 100 ? '#c0392b' : '#27ae60',
                          width: `${Math.min(porcentagemTotal, 100)}%`
                        }
                      ]} 
                    />
                  </View>

                  <Text style={styles.ocupacaoTexto}>
                    {ocupacao.total}/{VAGAS_POR_HORARIO}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.ocupacaoLegenda}>
            <View style={styles.ocupacaoLegendaItem}>
              <View style={[styles.ocupacaoLegendaCor, { backgroundColor: '#27ae60' }]} />
              <Text style={styles.ocupacaoLegendaTexto}>Vagas totais</Text>
            </View>
          </View>
        </View>
      )}

      <Calendar
        onDayPress={day => setDataSelecionada(day.dateString)}
        markedDates={{
          ...marcacoes,
          ...diasBloqueados, // *** ADICIONANDO DIAS BLOQUEADOS AO CALENDÁRIO ***
          ...(dataSelecionada ? {
            [dataSelecionada]: {
              ...(marcacoes[dataSelecionada] || {}),
              ...(diasBloqueados[dataSelecionada] || {}), // *** PRESERVAR ESTILO DE DIA BLOQUEADO SE SELECIONADO ***
              selected: true,
              selectedColor: diasBloqueados[dataSelecionada] ? '#666' : '#00adf5', // *** COR DIFERENTE PARA DIAS BLOQUEADOS SELECIONADOS ***
            }
          } : {})
        }}
        onMonthChange={(month) => setDataSelecionada(null)} // Limpa a seleção do dia ao mudar de mês
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
          {/* *** VERIFICAR SE O DIA ESTÁ BLOQUEADO ANTES DE MOSTRAR BOTÃO *** */}
          {diasBloqueados[dataSelecionada] ? (
            <Text style={{ color: '#c0392b', fontWeight: 'bold', textAlign: 'center' }}>
              {diasBloqueados[dataSelecionada].motivo || 'Este dia está bloqueado para agendamentos.'}
            </Text>
          ) : ehPlanoRestrito(planoTatuador) && restricaoPlanoAtingida ? (
            <Text style={{ color: '#c0392b', fontWeight: 'bold', textAlign: 'center' }}>
              Não é possível agendar nesta data, seu plano contém restrições quando há tatuadores com o mesmo plano agendados no mesmo dia.
            </Text>
          ) : (
            <Button title="Agendar" onPress={abrirModal} color="#2ecc71" />
          )}
        </View>
      )}

      <View style={{ flex: 1, marginTop: 12 }}>
        {dataSelecionada && (
          <CardAgendamentos
            dataSelecionada={dataSelecionada}
            loading={loading}
            agendamentosOrdenados={agendamentosOrdenados}
            refreshing={refreshing}
            onRefresh={onRefresh}
            tatuadorEmail={tatuadorEmail}
            obterNomeTatuador={obterNomeTatuador}
            removerAgendamento={removerAgendamento}
            agendamentoJaPassou={agendamentoJaPassou}
            confirmarAtendimento={confirmarAtendimento}
            registrarClienteFaltou={registrarClienteFaltou}
            plano={planoTatuador}
            styles={styles}
            limiteAgendamentosMensais={limiteAgendamentosMensais}
          />
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={fecharModal}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Novo Agendamento</Text>
            <Text style={styles.modalSubtitle}>Data: {dataSelecionada}</Text>

            <Text style={styles.label}>Nome do Cliente:</Text>
            <TextInput
              style={styles.input}
              value={nomeCliente}
              onChangeText={setNomeCliente}
              placeholder="Nome do cliente"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Horário de Início:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horariosContainer}>
              {horariosDisponiveis.map((hora) => {
                const ocupacao = ocupacaoVagas[hora] || { total: 0, restritos: 0 };
                const horarioOcupado = ocupacao.total >= VAGAS_POR_HORARIO || 
                  (ehPlanoRestrito(planoTatuador) && ocupacao.restritos >= VAGAS_PLANOS_RESTRITOS);
                
                // Verificar se o horário já está selecionado como fim e é posterior ao início
                const horarioJaEhFim = horarioFim && horarioParaMinutos(hora) >= horarioParaMinutos(horarioFim);

                return (
                  <TouchableOpacity
                    key={`inicio-${hora}`}
                    style={[
                      styles.horarioItem,
                      horarioInicio === hora && { backgroundColor: '#2ecc71' },
                      horarioOcupado && { backgroundColor: '#e74c3c' },
                      horarioJaEhFim && { backgroundColor: '#7f8c8d' },
                    ]}
                    onPress={() => {
                      if (!horarioOcupado && !horarioJaEhFim) {
                        setHorarioInicio(hora);
                        // Se o horário de fim é anterior ao novo início, resetar o fim
                        if (horarioFim && horarioParaMinutos(hora) >= horarioParaMinutos(horarioFim)) {
                          setHorarioFim(null);
                        }
                      }
                    }}
                    disabled={horarioOcupado || horarioJaEhFim}
                  >
                    <Text
                      style={[
                        styles.horarioTexto,
                        (horarioInicio === hora || horarioOcupado || horarioJaEhFim) && { color: '#fff' },
                      ]}
                    >
                      {hora}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Horário de Fim:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horariosContainer}>
              {horariosDisponiveis.map((hora) => {
                const ocupacao = ocupacaoVagas[hora] || { total: 0, restritos: 0 };
                const horarioOcupado = ocupacao.total >= VAGAS_POR_HORARIO || 
                  (ehPlanoRestrito(planoTatuador) && ocupacao.restritos >= VAGAS_PLANOS_RESTRITOS);
                
                // Verificar se o horário já está selecionado como início ou é anterior ao início
                const horarioJaEhInicio = horarioInicio && horarioParaMinutos(hora) <= horarioParaMinutos(horarioInicio);

                return (
                  <TouchableOpacity
                    key={`fim-${hora}`}
                    style={[
                      styles.horarioItem,
                      horarioFim === hora && { backgroundColor: '#2ecc71' },
                      horarioOcupado && { backgroundColor: '#e74c3c' },
                      horarioJaEhInicio && { backgroundColor: '#7f8c8d' },
                    ]}
                    onPress={() => {
                      if (!horarioOcupado && !horarioJaEhInicio && horarioInicio) {
                        setHorarioFim(hora);
                      }
                    }}
                    disabled={horarioOcupado || horarioJaEhInicio || !horarioInicio}
                  >
                    <Text
                      style={[
                        styles.horarioTexto,
                        (horarioFim === hora || horarioOcupado || horarioJaEhInicio) && { color: '#fff' },
                      ]}
                    >
                      {hora}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Preço (R$):</Text>
            <TextInput
              style={styles.input}
              value={preco}
              onChangeText={setPreco}
              placeholder="0,00"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={fecharModal}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonConfirm]}
                onPress={confirmarAgendamento}
              >
                <Text style={styles.buttonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    showsVerticalScrollIndicator:'false',
    flex: 1, // Isso faz com que o ScrollView ocupe todo o espaço disponível
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardText: {
    color: '#fff',
    fontSize: 14,
  },
  cardTextHorario: {
    color: '#fff',
    fontSize: 14,
    flexShrink: 1, // Permite que o texto quebre se for muito longo
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardInfoContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cardInfoText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  alertaPagamentoContainer: {
    backgroundColor: '#c0392b',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  alertaPagamentoTexto: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  ocupacaoContainer: {
    marginBottom: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
  },
  ocupacaoTitulo: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ocupacaoScroll: {
    flexDirection: 'row',
  },
  ocupacaoItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 60,
  },
  ocupacaoHora: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
  ocupacaoBarraContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  ocupacaoBarra: {
    height: '100%',
    borderRadius: 4,
  },
  ocupacaoBarraRestrita: {
    height: '100%',
    borderRadius: 4,
  },
  ocupacaoTexto: {
    color: '#ccc',
    fontSize: 10,
  },
  ocupacaoLegenda: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'center',
  },
  ocupacaoLegendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ocupacaoLegendaCor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  ocupacaoLegendaTexto: {
    color: '#ccc',
    fontSize: 12,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 6,
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
  horariosContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  horarioItem: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  horarioTexto: {
    color: '#ccc',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    borderRadius: 6,
    padding: 12,
    flex: 1,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#7f8c8d',
    marginRight: 8,
  },
  buttonConfirm: {
    backgroundColor: '#2ecc71',
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
