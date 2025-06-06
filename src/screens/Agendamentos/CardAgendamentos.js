import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function CardAgendamentos({
  dataSelecionada,
  loading,
  agendamentosOrdenados,
  refreshing,
  onRefresh,
  tatuadorEmail,
  obterNomeTatuador,
  removerAgendamento,
  agendamentoJaPassou,
  confirmarAtendimento,
  registrarClienteFaltou,
  plano,
  styles,
  limiteAgendamentosMensais
}) {
  if (!dataSelecionada) return null;

  if (loading) {
    return <ActivityIndicator size="large" color="#00adf5" style={{ marginTop: 20 }} />;
  }

  // Função para verificar se o agendamento está dentro do período de 24h
  const dentroDoLimiteDe24h = (item) => {
    if (!item.data) return false;
    
    // Se for um agendamento agrupado (de outro tatuador)
    if (item.horarios && item.horarios.length > 0) {
      // Verificar o primeiro horário
      const primeiroHorario = [...item.horarios].sort((a, b) => {
        const horaA = parseInt((a.hora || a.horaInicio).replace(':', ''), 10);
        const horaB = parseInt((b.hora || b.horaInicio).replace(':', ''), 10);
        return horaA - horaB; // Ordem crescente para pegar o primeiro
      })[0];
      
      const horarioInicio = primeiroHorario.hora || primeiroHorario.horaInicio;
      const [hora, minuto] = horarioInicio.split(':').map(Number);
      const dataHoraAgendada = new Date(`${item.data}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`);
      const agora = new Date();
      
      // Calcular a diferença em milissegundos e converter para horas
      const diferencaEmHoras = (dataHoraAgendada - agora) / (1000 * 60 * 60);
      
      // Retorna true se faltam menos de 24 horas para o atendimento
      return diferencaEmHoras < 24;
    } 
    // Se for um agendamento individual (meu)
    else {
      const horarioInicio = item.horarioInicio || item.hora;
      const [hora, minuto] = horarioInicio.split(':').map(Number);
      const dataHoraAgendada = new Date(`${item.data}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`);
      const agora = new Date();
      
      // Calcular a diferença em milissegundos e converter para horas
      const diferencaEmHoras = (dataHoraAgendada - agora) / (1000 * 60 * 60);
      
      // Retorna true se faltam menos de 24 horas para o atendimento
      return diferencaEmHoras < 24;
    }
  };

  // Função para verificar se o usuário pode excluir o agendamento
  const podeExcluir = (item) => {
    // Se não tem limite de atendimentos, pode excluir a qualquer momento
    if (limiteAgendamentosMensais <= 0) {
      return true;
    }
    
    // Se tem limite de atendimentos e está dentro das 24h, não pode excluir
    return !dentroDoLimiteDe24h(item);
  };

  // Função para tentar excluir o agendamento com verificação
  const tentarExcluir = (item) => {
    if (podeExcluir(item)) {
      removerAgendamento(item.id);
    } else {
      Alert.alert(
        "Não é possível excluir",
        "Agendamentos só podem ser excluídos até 24 horas antes do horário marcado.",
        [{ text: "OK" }]
      );
    }
  };

  // Função para formatar os horários em uma string com início e fim
  const formatarHorarios = (horarios) => {
    if (!horarios || horarios.length === 0) return "";
    
    // Ordenar os horários
    const horariosOrdenados = [...horarios].sort((a, b) => {
      const horaA = parseInt((a.hora || a.horaInicio).replace(':', ''), 10);
      const horaB = parseInt((b.hora || b.horaInicio).replace(':', ''), 10);
      return horaA - horaB;
    });
    
    // Retornar os horários formatados com início e fim
    return horariosOrdenados.map(h => {
      const inicio = h.horaInicio || h.hora;
      const fim = h.horaFim || h.hora;
      
      if (inicio === fim) {
        return inicio;
      } else {
        return `${inicio} - ${fim}`;
      }
    }).join(', ');
  };

  // Função para formatar um único horário com início e fim
  const formatarHorarioUnico = (item) => {
    const inicio = item.horarioInicio || item.hora;
    const fim = item.horarioFim || item.hora;
    
    if (inicio === fim) {
      return inicio;
    } else {
      return `${inicio} - ${fim}`;
    }
  };

  return (
    <FlatList
      data={agendamentosOrdenados}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
          Nenhum agendamento para esta data.
        </Text>
      }
      renderItem={({ item }) => {
        const souEu = item.tatuador?.toLowerCase() === tatuadorEmail;
        const nomeProfissional = obterNomeTatuador(item.tatuador);
        
        // Determinar se é um card agrupado (de outro tatuador) ou individual (meu)
        const ehCardAgrupado = !souEu && item.horarios && item.horarios.length > 0;
        
        // Obter o horário para exibição
        const horarioExibido = ehCardAgrupado 
          ? formatarHorarios(item.horarios)  // Para outros tatuadores, mostrar todos os horários
          : formatarHorarioUnico(item);      // Para meus agendamentos, mostrar horário início-fim

        return (
          <View style={[
            styles.card, 
            souEu && { backgroundColor: '#14532d' },
            item.clienteFaltou && { backgroundColor: '#7D3C98' } // Cor diferente para clientes que faltaram
          ]}>
            {/* Cabeçalho do card com nome do profissional e botão de excluir */}
            <View style={styles.cardHeader}>
              <View style={styles.cardRow}>
                <Icon name="user" size={16} color="#ccc" />
                <Text style={styles.cardText}> Profissional: {nomeProfissional}</Text>
              </View>

              {souEu && !item.finalizado && !item.clienteFaltou && (
                <TouchableOpacity 
                  onPress={() => tentarExcluir(item)} 
                  style={{ 
                    paddingLeft: 10,
                    opacity: podeExcluir(item) ? 1 : 0.5 
                  }}
                >
                  <Icon name="trash" size={18} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>

            {/* Horários abaixo do nome do profissional */}
            <View style={styles.cardRow}>
              <Icon name="clock-o" size={16} color="#ccc" />
              <Text style={styles.cardTextHorario}> 
                {ehCardAgrupado ? " Horários: " : " Horário: "}
                {horarioExibido}
              </Text>
            </View>

            {souEu && (
              <View style={styles.cardInfoContainer}>
                {item.nomeCliente && (
                  <Text style={styles.cardInfoText}>Cliente: {item.nomeCliente}</Text>
                )}
                {item.preco !== undefined && (
                  <Text style={styles.cardInfoText}>Preço: R${item.preco.toFixed(2)}</Text>
                )}
                {item.pagamentoConfirmado && (
                  <Text style={[styles.cardInfoText, { color: '#27ae60' }]}>
                    ✓ Pagamento confirmado
                  </Text>
                )}
                {limiteAgendamentosMensais > 0 && dentroDoLimiteDe24h(item) && !agendamentoJaPassou(item) && (
                  <Text style={[styles.cardInfoText, { color: '#e74c3c', fontSize: 12 }]}>
                    ⚠️ Não pode ser excluído (menos de 24h) - Limitação do Plano
                  </Text>
                )}
              </View>
            )}

            {/* Para cards de outros tatuadores, mostrar quantos horários estão agendados */}
            {!souEu && ehCardAgrupado && item.horarios.length > 1 && (
              <View style={styles.cardInfoContainer}>
                <Text style={[styles.cardInfoText, { color: '#128ef3' }]}>
                  {item.horarios.length} horários agendados
                </Text>
              </View>
            )}

            {souEu && agendamentoJaPassou(item) && (
              <View style={{ marginTop: 10 }}>
                {item.finalizado ? (
                  <Text style={{ color: '#27ae60', fontWeight: 'bold' }}>
                    ✓ Atendimento confirmado
                  </Text>
                ) : item.clienteFaltou ? (
                  <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                    ✗ Atendimento Cancelado  
                  </Text>
                ) : (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity
                      onPress={() => confirmarAtendimento(item.id)}
                      style={{
                        backgroundColor: '#2980b9',
                        padding: 10,
                        borderRadius: 6,
                        flex: 1,
                        alignItems: 'center',
                        marginRight: 5,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                        Confirmar atendimento
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => registrarClienteFaltou(item.id)}
                      style={{
                        backgroundColor: '#8e44ad',
                        padding: 10,
                        borderRadius: 6,
                        flex: 1,
                        alignItems: 'center',
                        marginLeft: 5,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                        Atendimento Cancelado
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}
