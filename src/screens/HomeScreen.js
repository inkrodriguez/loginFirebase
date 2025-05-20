// HomeScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  Button,
  Alert,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  orderBy,
  doc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import FinanceScreen from './FinanceScreen';

const Tab = createBottomTabNavigator();

export default function HomeScreen() {
  // ---------- Componentes das telas das abas --------------

  // Tela Agendamentos
  function Agendamentos() {
    const [dataSelecionada, setDataSelecionada] = useState(new Date());
    const [disponivel, setDisponivel] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [emailUsuario, setEmailUsuario] = useState(null);
    const [agendamentosUsuario, setAgendamentosUsuario] = useState([]);
    const [registroUsuario, setRegistroUsuario] = useState(null);
    const [nomeCliente, setNomeCliente] = useState("");
    const [horaSelecionada, setHoraSelecionada] = useState(null);
    const [preco, setPreco] = useState("");

    const horariosDisponiveis = [
      "07:00",
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
      "20:00",
    ];

    useEffect(() => {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setEmailUsuario(user.email);
        }
      });
      return unsubscribe;
    }, []);

    const buscarAgendamentosFuturos = async () => {
      if (!emailUsuario) return;

      const hojeStr = new Date().toISOString().split("T")[0];

      try {
        const snapshot = await getDocs(
        query(
            collection(db, "agendamentos"),
            where("tatuador", "==", emailUsuario),
            where("finalizado", "==", false),  // Só os não finalizados
            orderBy("data", "asc")
        )
        );


        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setAgendamentosUsuario(dados);
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
      }
    };

    useEffect(() => {
      buscarAgendamentosFuturos();
    }, [emailUsuario, modalVisible]);

    useEffect(() => {
      const verificarDisponibilidade = async () => {
        if (!emailUsuario) return;

        dataSelecionada.setHours(0, 0, 0, 0);
        const dataStr = formatarDataLocal(dataSelecionada);


        try {
          const snapshot = await getDocs(
            query(collection(db, "agendamentos"), where("data", "==", dataStr))
          );

          const registros = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const jaAgendadoPorUsuario = registros.find(
            (r) => r.tatuador === emailUsuario
          );

          if (jaAgendadoPorUsuario) {
            setRegistroUsuario(jaAgendadoPorUsuario);
            setDisponivel(false);
          } else {
            setRegistroUsuario(null);
            setDisponivel(registros.length < 4);
          }
        } catch (err) {
          console.error("Erro ao verificar disponibilidade:", err);
        }
      };

      verificarDisponibilidade();
    }, [dataSelecionada, emailUsuario]);

    const abrirModal = () => setModalVisible(true);
    const fecharModal = () => {
      setNomeCliente("");
      setHoraSelecionada(null);
      setPreco("");
      setModalVisible(false);
    };

       const formatarDataLocal = (data) => {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
        };

    const confirmarAgendamento = async () => {
      if (!emailUsuario) {
        Alert.alert("Erro", "Usuário não autenticado.");
        return;
      }

      if (!nomeCliente.trim()) {
        Alert.alert("Erro", "Por favor, informe o nome do cliente.");
        return;
      }

      if (!horaSelecionada) {
        Alert.alert("Erro", "Por favor, selecione um horário.");
        return;
      }

      // Validar preço: pode aceitar vazio ou 0? Aqui vou exigir que seja número positivo.
      const precoNumero = parseFloat(preco.replace(",", "."));
      if (isNaN(precoNumero) || precoNumero < 0) {
        Alert.alert("Erro", "Informe um preço válido (0 ou mais).");
        return;
      }

      const dataStr = dataSelecionada.toISOString().split("T")[0];

      try {
        await addDoc(collection(db, "agendamentos"), {
          data: dataStr,
          hora: horaSelecionada,
          tatuador: emailUsuario,
          nomeCliente: nomeCliente.trim(),
          preco: precoNumero,
          finalizado: false,
          criadoEm: new Date(),
        });

        Alert.alert("Sucesso", "Agendamento confirmado!");
        setDisponivel(false);
        fecharModal();
      } catch (error) {
        console.error("Erro ao agendar:", error);
        Alert.alert("Erro", "Não foi possível agendar. Tente novamente.");
      }
    };

    const excluirAgendamento = async () => {
      try {
        await deleteDoc(doc(db, "agendamentos", registroUsuario.id));
        Alert.alert("Sucesso", "Agendamento excluído.");
        setRegistroUsuario(null);
        setDisponivel(true);
        buscarAgendamentosFuturos();
      } catch (error) {
        console.error("Erro ao excluir:", error);
        Alert.alert("Erro", "Não foi possível excluir o agendamento.");
      }
    };

    // Função para excluir via botão dentro do card (opcional)
    const handleExcluir = async (id) => {
      try {
        await deleteDoc(doc(db, "agendamentos", id));
        Alert.alert("Sucesso", "Agendamento excluído.");
        if (registroUsuario?.id === id) setRegistroUsuario(null);
        buscarAgendamentosFuturos();
      } catch (error) {
        console.error("Erro ao excluir:", error);
        Alert.alert("Erro", "Não foi possível excluir o agendamento.");
      }
    };

    return (       
      <View style={styles.container}>
        {agendamentosUsuario.length > 0 ? (
        <FlatList
  data={agendamentosUsuario}
  keyExtractor={(item) => item.id}
renderItem={({ item }) => {
  const hoje = new Date();
  const dataAgendamento = new Date(item.data + "T00:00:00");
  const agendamentoPassado = dataAgendamento < hoje;

 const confirmarAtendimento = async () => {
  try {
    // Salva nas finanças do tatuador
    await addDoc(collection(db, "financas"), {
      data: item.data,
      valor: item.preco || 0,
      cliente: item.nomeCliente,
      tatuador: emailUsuario,
      registradoEm: new Date(),
    });

    // Atualiza o agendamento para marcar como finalizado
    await updateDoc(doc(db, "agendamentos", item.id), {
      finalizado: true,
      finalizadoEm: new Date(),
    });

    Alert.alert("Sucesso", "Atendimento confirmado e adicionado às finanças.");
    buscarAgendamentosFuturos();
  } catch (err) {
    console.error("Erro ao confirmar atendimento:", err);
    Alert.alert("Erro", "Não foi possível confirmar o atendimento.");
  }
};


  return (
    <View style={styles.cardAgendamento}>
      <View style={styles.linhaInfo}>
        <Ionicons name="calendar" size={16} color="#666" />
        <Text style={styles.textoInfo}>
          {item.data.split("-").reverse().join("/")}
        </Text>
        <Ionicons
          name="time"
          size={16}
          color="#666"
          style={{ marginLeft: 10 }}
        />
        <Text style={styles.textoInfo}>{item.hora}</Text>
      </View>
      <Text style={styles.nomeCliente}>{item.nomeCliente}</Text>
      {item.preco !== undefined && (
        <Text style={styles.preco}>
          Preço: R$ {Number(item.preco).toFixed(2)}
        </Text>
      )}

      {agendamentoPassado ? (
        <TouchableOpacity
          onPress={confirmarAtendimento}
          style={{
            backgroundColor: "#27ae60",
            padding: 10,
            marginTop: 10,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
            Confirmar atendimento?
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => handleExcluir(item.id)}
          style={styles.botaoExcluir}
        >
          <Ionicons name="trash" size={20} color="#c0392b" />
        </TouchableOpacity>
      )}
    </View>
  );
}}

  style={{ marginBottom: 20, maxHeight: 200 }}
/>

        ) : (
          <Text style={{ fontStyle: "italic", marginBottom: 20, textAlign:'center' }}>
            Nenhum agendamento encontrado.
          </Text>
        )}

        <DateTimePicker
          value={dataSelecionada}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "calendar"}
          onChange={(e, selected) => {
            if (selected) setDataSelecionada(selected);
          }}
          minimumDate={new Date()}
          style={{ marginBottom: 20 }}
        />

        {disponivel !== null && (
          <View style={styles.resultado}>
            <Text
              style={{ color: disponivel ? "green" : "red", fontSize: 18 }}
            >
              {disponivel ? "✅ Data disponível!" : "❌ Data indisponível."}
            </Text>

            {registroUsuario && (
              <>
                <Text style={{ marginTop: 10, fontSize: 16 }}>
                  Você já tem um agendamento nesse dia.
                </Text>
                <Button
                  title="Excluir meu agendamento"
                  onPress={excluirAgendamento}
                  color="#c0392b"
                />
              </>
            )}

            {disponivel && (
              <View style={{ marginTop: 20 }}>
                <Button
                  title="Confirmar agendamento"
                  onPress={abrirModal}
                  color="#27ae60"
                />
              </View>
            )}
          </View>
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
              <Text style={styles.dataTexto}>
                {dataSelecionada.toLocaleDateString()}
              </Text>

              <Text style={styles.label}>Email do usuário:</Text>
              <Text style={styles.dataTexto}>{emailUsuario}</Text>

              <Text style={styles.label}>Nome do Cliente:</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o nome do cliente"
                value={nomeCliente}
                onChangeText={setNomeCliente}
              />

              <Text style={styles.label}>Preço (R$):</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o preço"
                value={preco}
                onChangeText={setPreco}
                keyboardType="default"
              />

              <Text style={styles.label}>Escolha um horário:</Text>

              <ScrollView
                horizontal={true}
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
                    <Text
                      style={{
                        color: horaSelecionada === hora ? "#fff" : "#000",
                      }}
                    >
                      {hora}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: "row", marginTop: 20 }}>
                <Button title="Cancelar" onPress={fecharModal} />
                <View style={{ width: 20 }} />
                <Button title="Confirmar" onPress={confirmarAgendamento} />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Telas em branco para as outras abas (Finanças e Pagamentos)
  function Financeiro() {
    return (
      <View style={styles.container}>
        <Text>Finanças do Tatuador - Em construção</Text>
      </View>
    );
  }

  function Pagamentos() {
    return (
      <View style={styles.container}>
        <Text>EM DESENVOLVIMENTO - TELA PAGAMENTOS!</Text>
      </View>
    );
  }

 return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = "home";

          if (route.name === "Agendamentos") {
            iconName = "calendar";
          } else if (route.name === "Financeiro") {
            iconName = "cash";
          } else if (route.name === "Pagamentos") {
            iconName = "card";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#27ae60",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Agendamentos" component={Agendamentos} />
      <Tab.Screen name="Finanças" component={FinanceScreen} />
      <Tab.Screen name="Pagamentos" component={Pagamentos} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:
      Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    paddingHorizontal: 20,
    backgroundColor: "#f4f4f4",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 8,
    fontWeight: "600",
  },
  resultado: {
    marginVertical: 20,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  label: {
    fontWeight: "600",
    marginTop: 10,
  },
  dataTexto: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 5,
    padding: 8,
    marginTop: 5,
  },
  horaBotao: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 5,
    minWidth: 70,
    alignItems: "center",
  },
  horaBotaoSelecionado: {
    backgroundColor: "#27ae60",
    borderColor: "#27ae60",
  },
  cardAgendamento: {
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    position: "relative",
  },
  linhaInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  textoInfo: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
  },
  nomeCliente: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },
  preco: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27ae60",
  },
  botaoExcluir: {
    position: "absolute",
    top: 8,
    right: 8,
  },
});
