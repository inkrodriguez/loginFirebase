import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { getAuth } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function FinanceScreen() {
  const [financas, setFinancas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [emailUsuario, setEmailUsuario] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setEmailUsuario(user.email);
    }
  }, []);

  useEffect(() => {
    if (!emailUsuario) return;

    setLoading(true);

    const q = query(
      collection(db, "agendamentos"),
      where("tatuador", "==", emailUsuario),
      where("finalizado", "==", true),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const dados = [];
        let totalValue = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();

          let dataDate = null;
          if (data.data) {
            dataDate = new Date(data.data + "T00:00:00");
            if (isNaN(dataDate.getTime())) dataDate = null;
          }

          dados.push({
            id: doc.id,
            ...data,
            data: dataDate,
          });

          if (typeof data.preco === "number" && !isNaN(data.preco)) {
            totalValue += data.preco;
          }
        });

        setFinancas(dados);
        setTotal(totalValue);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao escutar finanças:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe(); // limpa listener ao desmontar componente
  }, [emailUsuario]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.texto}>Cliente: {item.nomeCliente || "—"}</Text>
      <Text style={styles.texto}>
        Valor: R$ {typeof item.preco === "number" ? item.preco.toFixed(2) : "0.00"}
      </Text>
      <Text style={styles.texto}>
        Data: {item.data instanceof Date && !isNaN(item.data) ? item.data.toLocaleDateString() : "—"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#27ae60" />
      ) : (
        <>
          <FlatList
            data={financas}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.texto}>Sem registros</Text>}
          />
          <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f4f4" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  texto: { fontSize: 16, color: "#333" },
  total: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#27ae60",
  },
});
