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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function HomeScreen() {
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [disponivel, setDisponivel] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [emailUsuario, setEmailUsuario] = useState(null);
  const [agendamentosUsuario, setAgendamentosUsuario] = useState([]);
  const [registroUsuario, setRegistroUsuario] = useState(null);
  const [nomeCliente, setNomeCliente] = useState(""); // novo estado para o nome do cliente

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmailUsuario(user.email);
      }
    });
    return unsubscribe;
  }, []);

  // Função para buscar agendamentos futuros do usuário
  const buscarAgendamentosFuturos = async () => {
    if (!emailUsuario) return;

    const hojeStr = new Date().toISOString().split("T")[0];

    try {
      const snapshot = await getDocs(
        query(
          collection(db, "agendamentos"),
          where("tatuador", "==", emailUsuario),
          where("data", ">=", hojeStr)
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

      const dataStr = dataSelecionada.toISOString().split("T")[0];

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
    setNomeCliente(""); // limpa o campo ao fechar modal
    setModalVisible(false);
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

    const dataStr = dataSelecionada.toISOString().split("T")[0];

    try {
      await addDoc(collection(db, "agendamentos"), {
        data: dataStr,
        hora: "dia todo",
        tatuador: emailUsuario,
        nomeCliente: nomeCliente.trim(),
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
      // Atualiza lista após exclusão
      buscarAgendamentosFuturos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      Alert.alert("Erro", "Não foi possível excluir o agendamento.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agendamento de Macas</Text>

      <Text style={styles.subtitle}>Seus Agendamentos Futuros:</Text>
      {agendamentosUsuario.length > 0 ? (
        <FlatList
          data={agendamentosUsuario}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
         <Text style={styles.agendamentoItem}>
    📅 {item.data.split('-').reverse().join('/')} - Cliente: {item.nomeCliente}
    </Text>

          )}
          style={{ marginBottom: 20, maxHeight: 150 }}
        />
      ) : (
        <Text style={{ fontStyle: "italic", marginBottom: 20 }}>
          Nenhum agendamento futuro encontrado.
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
          <Text style={{ color: disponivel ? "green" : "red", fontSize: 18 }}>
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

            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.buttonCancel}
                onPress={fecharModal}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonConfirm}
                onPress={confirmarAgendamento}
              >
                <Text style={styles.buttonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 40,
    backgroundColor: "white",
    paddingHorizontal: 16,
    alignItems: "center",
  },
  title: {
    color: "black",
    fontSize: 24,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    alignSelf: "center",
    marginBottom: 8,
  },
  agendamentoItem: {
    fontSize: 16,
    marginBottom: 4,
  },
  resultado: {
    marginTop: 10,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  label: {
    fontWeight: "600",
    marginTop: 10,
  },
  dataTexto: {
    fontSize: 16,
    marginBottom: 15,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
  },
  buttonCancel: {
    backgroundColor: "#ccc",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  buttonConfirm: {
    backgroundColor: "#27ae60",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    marginBottom: 15,
  },
});
