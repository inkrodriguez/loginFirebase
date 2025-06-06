// screens/Agendamentos/ModalAgendamentoHorarios.js

import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Button,
  StyleSheet
} from 'react-native';

export default function ModalAgendamentoHorarios({
  visible,
  onClose,
  dataSelecionada,
  planoTatuador,
  nomeCliente,
  setNomeCliente,
  preco,
  setPreco,
  horariosDisponiveis,
  horarioInicio,
  setHorarioInicio,
  horarioFim,
  setHorarioFim,
  confirmarAgendamento,
  ocupacaoVagas,
  VAGAS_POR_HORARIO,
  VAGAS_PLANOS_RESTRITOS,
  ehPlanoRestrito
}) {
  const planoRequerAlertaPagamento = () =>
    planoTatuador === 'Porcentagem' || planoTatuador === 'Convidado';

  // Função para verificar se um horário está disponível para seleção
  const horarioDisponivel = (hora, tipo) => {
    // Se não há ocupação, todos os horários estão disponíveis
    if (!ocupacaoVagas || !ocupacaoVagas[hora]) return true;
    
    const ocupacao = ocupacaoVagas[hora];
    
    // Verificar limite geral de vagas
    if (ocupacao.total >= VAGAS_POR_HORARIO) {
      return false;
    }
    
    // Se for um plano restrito, verificar limite específico
    if (ehPlanoRestrito(planoTatuador) && ocupacao.restritos >= VAGAS_PLANOS_RESTRITOS) {
      return false;
    }
    
    // Se for horário de fim, verificar se é posterior ao horário de início
    if (tipo === 'fim' && horarioInicio) {
      const inicioMinutos = parseInt(horarioInicio.replace(':', ''), 10);
      const fimMinutos = parseInt(hora.replace(':', ''), 10);
      return fimMinutos > inicioMinutos;
    }
    
    // Se for horário de início, verificar se já tem um horário de fim selecionado
    if (tipo === 'inicio' && horarioFim) {
      const inicioMinutos = parseInt(hora.replace(':', ''), 10);
      const fimMinutos = parseInt(horarioFim.replace(':', ''), 10);
      return inicioMinutos < fimMinutos;
    }
    
    return true;
  };

  // Função para obter a cor de fundo do botão de horário
  const getHorarioBackgroundColor = (hora, tipo) => {
    // Se o horário está selecionado
    if ((tipo === 'inicio' && hora === horarioInicio) || (tipo === 'fim' && hora === horarioFim)) {
      return '#27ae60'; // Verde para selecionado
    }
    
    // Se o horário não está disponível
    if (!horarioDisponivel(hora, tipo)) {
      return '#c0392b'; // Vermelho para indisponível
    }
    
    // Se há ocupação, mostrar gradiente de ocupação
    if (ocupacaoVagas && ocupacaoVagas[hora]) {
      const ocupacao = ocupacaoVagas[hora];
      const porcentagemTotal = (ocupacao.total / VAGAS_POR_HORARIO) * 100;
      
      if (porcentagemTotal >= 75) {
        return '#e67e22'; // Laranja para alta ocupação
      } else if (porcentagemTotal >= 50) {
        return '#f39c12'; // Amarelo para média ocupação
      }
    }
    
    return '#333'; // Cinza padrão para disponível
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalFundo}>
        <View style={styles.modal}>
          <Text style={styles.tituloModal}>Agendar Cliente - {dataSelecionada}</Text>

          {planoRequerAlertaPagamento() && (
            <View style={styles.alertaModalContainer}>
              <Text style={styles.alertaModalTexto}>
                {planoTatuador === 'Porcentagem'
                  ? 'ATENÇÃO: Você deverá enviar o valor da porcentagem antes de finalizar o agendamento.'
                  : 'ATENÇÃO: Você deverá enviar o valor da diária (R$100,00) antes de finalizar o agendamento.'}
              </Text>
            </View>
          )}

          <TextInput
            placeholder="Nome do cliente"
            value={nomeCliente}
            onChangeText={setNomeCliente}
            style={styles.input}
            placeholderTextColor="#999"
          />

          <TextInput
            placeholder="Preço (ex: 150.00)"
            value={preco}
            onChangeText={setPreco}
            style={styles.input}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          <Text style={styles.secaoTitulo}>Horário de Início:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horariosContainer}>
            {horariosDisponiveis.map((hora) => (
              <TouchableOpacity
                key={`inicio-${hora}`}
                onPress={() => horarioDisponivel(hora, 'inicio') && setHorarioInicio(hora)}
                style={[
                  styles.botaoHora,
                  { backgroundColor: getHorarioBackgroundColor(hora, 'inicio') },
                  !horarioDisponivel(hora, 'inicio') && styles.botaoHoraIndisponivel
                ]}
                disabled={!horarioDisponivel(hora, 'inicio')}
              >
                <Text
                  style={[
                    styles.textoBotaoHora,
                    (hora === horarioInicio || !horarioDisponivel(hora, 'inicio')) && { color: '#fff' }
                  ]}
                >
                  {hora}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.secaoTitulo}>Horário de Fim:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horariosContainer}>
            {horariosDisponiveis.map((hora) => (
              <TouchableOpacity
                key={`fim-${hora}`}
                onPress={() => horarioDisponivel(hora, 'fim') && setHorarioFim(hora)}
                style={[
                  styles.botaoHora,
                  { backgroundColor: getHorarioBackgroundColor(hora, 'fim') },
                  !horarioDisponivel(hora, 'fim') && styles.botaoHoraIndisponivel
                ]}
                disabled={!horarioDisponivel(hora, 'fim')}
              >
                <Text
                  style={[
                    styles.textoBotaoHora,
                    (hora === horarioFim || !horarioDisponivel(hora, 'fim')) && { color: '#fff' }
                  ]}
                >
                  {hora}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Legenda de cores */}
          <View style={styles.legendaContainer}>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaCor, { backgroundColor: '#27ae60' }]} />
              <Text style={styles.legendaTexto}>Selecionado</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaCor, { backgroundColor: '#333' }]} />
              <Text style={styles.legendaTexto}>Disponível</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaCor, { backgroundColor: '#f39c12' }]} />
              <Text style={styles.legendaTexto}>Média ocupação</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaCor, { backgroundColor: '#e67e22' }]} />
              <Text style={styles.legendaTexto}>Alta ocupação</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaCor, { backgroundColor: '#c0392b' }]} />
              <Text style={styles.legendaTexto}>Indisponível</Text>
            </View>
          </View>

          {/* Resumo da seleção */}
          {horarioInicio && horarioFim && (
            <View style={styles.resumoContainer}>
              <Text style={styles.resumoTexto}>
                Agendamento: {horarioInicio} até {horarioFim}
              </Text>
            </View>
          )}

          <View style={styles.botoesContainer}>
            <TouchableOpacity style={styles.botaoCancelar} onPress={onClose}>
              <Text style={styles.textoBotao}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.botaoConfirmar,
                (!horarioInicio || !horarioFim) && { opacity: 0.5 }
              ]} 
              onPress={confirmarAgendamento}
              disabled={!horarioInicio || !horarioFim}
            >
              <Text style={styles.textoBotao}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
    maxHeight: '90%',
  },
  tituloModal: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secaoTitulo: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  alertaModalContainer: {
    backgroundColor: '#f39c12',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  alertaModalTexto: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  horariosContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  botaoHora: {
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  botaoHoraSelecionado: {
    backgroundColor: '#27ae60',
  },
  botaoHoraIndisponivel: {
    opacity: 0.7,
  },
  textoBotaoHora: {
    color: '#ccc',
  },
  legendaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 12,
    backgroundColor: '#2c2c2c',
    padding: 8,
    borderRadius: 8,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  legendaCor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendaTexto: {
    color: '#ccc',
    fontSize: 12,
  },
  resumoContainer: {
    backgroundColor: '#2c2c2c',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  resumoTexto: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botaoCancelar: {
    backgroundColor: '#c0392b',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  botaoConfirmar: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
