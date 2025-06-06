import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, Alert, ScrollView, Image, TextInput, ActivityIndicator
} from "react-native";
import {
  collection, getDocs, addDoc, serverTimestamp, query, where
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

export default function Loja() {
  const auth = getAuth();
  const usuarioLogado = auth.currentUser;

  const [produtos, setProdutos] = useState([]);
  const [tatuadores, setTatuadores] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [tatuadorSelecionado, setTatuadorSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [senha, setSenha] = useState("");
  const [senhaError, setSenhaError] = useState("");
  const [compraModalVisible, setCompraModalVisible] = useState(false);
  const [tatuadorModalVisible, setTatuadorModalVisible] = useState(false);
  const [senhaModalVisible, setSenhaModalVisible] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [produtosPorCategoria, setProdutosPorCategoria] = useState({});


useEffect(() => {
  async function fetchProdutos() {
    setLoadingProdutos(true);
    try {
      const snapshot = await getDocs(collection(db, "produtos"));
      const produtosData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const categoriasOrganizadas = produtosData.reduce((acc, produto) => {
        const categoria = produto.categoria || "Outros";
        if (!acc[categoria]) acc[categoria] = [];
        acc[categoria].push(produto);
        return acc;
      }, {});
      
      setProdutosPorCategoria(categoriasOrganizadas);
    } catch (e) {
      console.error("Erro ao buscar produtos:", e);
    } finally {
      setLoadingProdutos(false);
    }
  }
  fetchProdutos();
}, []);


  useEffect(() => {
    async function fetchTatuadores() {
      try {
        const snap = await getDocs(collection(db, "tatuadores"));
        setTatuadores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Erro ao buscar tatuadores:", e);
      }
    }
    fetchTatuadores();
  }, []);

  const abrirModalCompra = produto => {
    setProdutoSelecionado(produto);
    setTatuadorSelecionado(null);
    setQuantidade(1);
    setSenha("");
    setSenhaError("");
    setCompraModalVisible(true);
  };
  const fecharModalCompra = () => setCompraModalVisible(false);
  const abrirModalTatuador = () => setTatuadorModalVisible(true);
  const fecharModalTatuador = () => setTatuadorModalVisible(false);
  const abrirModalSenha = () => {
    if (!tatuadorSelecionado) return Alert.alert("Erro", "Selecione um tatuador.");
    if (quantidade < 1) return Alert.alert("Erro", "Quantidade mínima 1.");
    setSenha(""); setSenhaError("");
    setSenhaModalVisible(true);
  };
  const fecharModalSenha = () => {
    setSenhaModalVisible(false);
    setSenha(""); setSenhaError("");
  };

  const handleSelecionarTatuador = tatuador => {
    setTatuadorSelecionado(tatuador);
    fecharModalTatuador();
  };
  const incrementarQuantidade = () => setQuantidade(q => q + 1);
  const decrementarQuantidade = () => setQuantidade(q => (q > 1 ? q - 1 : 1));

  const handleConfirmarCompra = async () => {
    setSenhaError("");
    if (!usuarioLogado?.email) {
      setSenhaError("Usuário não logado.");
      return;
    }
    if (!senha.trim()) {
      setSenhaError("Insira sua senha.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, usuarioLogado.email, senha);
      const compraData = {
        produtoId: produtoSelecionado.id,
        produtoNome: produtoSelecionado.nome,
        precoUnitario: produtoSelecionado.preco,
        quantidade,
        tatuadorId: tatuadorSelecionado.id,
        tatuadorNome: tatuadorSelecionado.nome,
        tatuadorEmail: tatuadorSelecionado.email,
        compradorUid: usuarioLogado.uid,
        compradorEmail: usuarioLogado.email,
        valorTotal: parseFloat((produtoSelecionado.preco * quantidade).toFixed(2)),
        dataCompra: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "compras"), compraData);
      Alert.alert("Sucesso", 
        `Compra realizada!\nProduto: ${produtoSelecionado.nome}\nQuantidade: ${quantidade}\nTatuador: ${tatuadorSelecionado.nome}\nTotal: R$${(produtoSelecionado.preco * quantidade).toFixed(2)}`);
      fecharModalSenha();
      fecharModalCompra();
    } catch (e) {
      console.error("Erro:", e);
      if (e.code?.includes("wrong-password")) {
        setSenhaError("Senha incorreta.");
      } else {
        setSenhaError("Erro ao autenticar. Tente mais tarde.");
      }
      setSenha("");
    }
  };

  const renderImagemProduto = produto => {
    return produto.imagem
      ? <Image source={{ uri: produto.imagem || 'https://www.buritama.sp.leg.br/imagens/parlamentares-2013-2016/sem-foto.jpg/image'}} style={styles.imagemProduto} resizeMode="contain" />
      : <View style={[styles.imagemProduto, styles.imagemPlaceholder]}>
          <Text style={styles.imagemPlaceholderTexto}>?</Text>
        </View>;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>Loja</Text>
{loadingProdutos ? (
  <ActivityIndicator color="#00adf5" size="large" />
) : (
  Object.keys(produtosPorCategoria).map((categoria) => (
    <View key={categoria}>
      <Text style={styles.subtitulo}>{categoria}</Text>
      <FlatList
        data={produtosPorCategoria[categoria]}
        horizontal
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item: produto }) => (
          <View style={styles.produtoCardHorizontal}>
            {renderImagemProduto(produto)}
            <View style={styles.infoProduto}>
              <Text style={styles.produtoNome}>{produto.nome}</Text>
              <Text style={styles.produtoPreco}>R$ {produto.preco.toFixed(2)}</Text>
              <TouchableOpacity style={styles.botaoComprar} onPress={() => abrirModalCompra(produto)}>
                <Text style={styles.textoBotao}>Comprar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  ))
)}


      {/* Modal compra */}
      <Modal visible={compraModalVisible} transparent animationType="slide" onRequestClose={fecharModalCompra}>
        <View style={styles.modalFundo}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Comprar: {produtoSelecionado?.nome}</Text>
            <TouchableOpacity style={styles.botaoSelecao} onPress={abrirModalTatuador}>
              <Text style={styles.textoBotaoSelecao}>{tatuadorSelecionado ? tatuadorSelecionado.nome : "Selecionar Tatuador"}</Text>
            </TouchableOpacity>
            <View style={styles.quantidadeContainer}>
              <TouchableOpacity onPress={decrementarQuantidade} style={styles.botaoQuantidade}><Text style={styles.textoBotaoQuantidade}>-</Text></TouchableOpacity>
              <Text style={styles.quantidadeTexto}>{quantidade}</Text>
              <TouchableOpacity onPress={incrementarQuantidade} style={styles.botaoQuantidade}><Text style={styles.textoBotaoQuantidade}>+</Text></TouchableOpacity>
            </View>
            <View style={styles.botoesAcaoContainer}>
              <TouchableOpacity style={[styles.botaoAcao, styles.botaoCancelar]} onPress={fecharModalCompra}><Text style={styles.textoBotaoAcao}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.botaoAcao, styles.botaoFinalizar, !tatuadorSelecionado && styles.botaoDesabilitado]} disabled={!tatuadorSelecionado} onPress={abrirModalSenha}>
                <Text style={styles.textoBotaoAcao}>Finalizar Compra</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal tatuador */}
      <Modal visible={tatuadorModalVisible} transparent animationType="fade" onRequestClose={fecharModalTatuador}>
        <View style={styles.modalFundo}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Escolha o tatuador</Text>
            <FlatList data={tatuadores} keyExtractor={i=>i.id} renderItem={({item})=>(
              <TouchableOpacity style={styles.tatuadorCard} onPress={()=>handleSelecionarTatuador(item)}>
                <Text style={styles.tatuadorNome}>{item.nome}</Text>
              </TouchableOpacity>
            )} ListEmptyComponent={<Text style={styles.listaVaziaTexto}>Nenhum tatuador.</Text>} />
            <TouchableOpacity style={[styles.botaoAcao, styles.botaoCancelar, {marginTop:15}]} onPress={fecharModalTatuador}>
              <Text style={styles.textoBotaoAcao}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal senha */}
      <Modal visible={senhaModalVisible} transparent animationType="slide" onRequestClose={fecharModalSenha}>
        <View style={styles.modalFundo}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Confirmar Identidade</Text>
            <TextInput
              style={styles.inputSenha}
              placeholder="Sua Senha"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
            {senhaError ? <Text style={styles.mensagemErroSenha}>{senhaError}</Text> : null}
            <View style={styles.botoesAcaoContainer}>
              <TouchableOpacity style={[styles.botaoAcao, styles.botaoCancelar]} onPress={fecharModalSenha}>
                <Text style={styles.textoBotaoAcao}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoAcao, styles.botaoFinalizar]} onPress={handleConfirmarCompra}>
                <Text style={styles.textoBotaoAcao}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e1e1e" },
  titulo: { fontSize: 28, fontWeight: "bold", margin: 20, color: "#fff" },
  subtitulo: {
    fontSize: 22,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 10,
    color: "#fff"
  },
  produtoCardHorizontal: {
    flexDirection: "row",
    backgroundColor: "#2a2a2a",
    marginRight: 16,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    width: 320
  },
  imagemProduto: { width: 100, height: 100, borderRadius: 10 },
  imagemPlaceholder: {
    backgroundColor: "#444", justifyContent: "center", alignItems: "center"
  },
  imagemPlaceholderTexto: { fontSize: 30, color: "#888" },
  infoProduto: { flex: 1, marginLeft: 10, justifyContent: "space-between" },
  produtoNome: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  produtoPreco: { fontSize: 16, color: "#ccc" },
  botaoComprar: {
    backgroundColor: "#00adf5", padding: 8, borderRadius: 6, alignItems: "center", marginTop: 5
  },
  textoBotao: { color: "#fff", fontWeight: "bold" },
  modalFundo: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center"
  },
  modalContainer: {
    backgroundColor: "#2a2a2a", borderRadius: 12, padding: 20, width: "85%", maxHeight: "80%"
  },
  modalTitulo: { fontSize: 20, fontWeight: "bold", marginBottom: 15, color: "#fff" },
  botaoSelecao: {
    borderColor: "#555", borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 20
  },
  textoBotaoSelecao: { fontSize: 16, color: "#fff" },
  quantidadeContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20, justifyContent: "center" },
  botaoQuantidade: {
    backgroundColor: "#555", borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8
  },
  textoBotaoQuantidade: { fontSize: 18, color: "#fff" },
  quantidadeTexto: { fontSize: 18, marginHorizontal: 20, color: "#fff" },
  botoesAcaoContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  botaoAcao: {
    flex: 1, padding: 10, borderRadius: 8, alignItems: "center", marginHorizontal: 5
  },
  botaoCancelar: { backgroundColor: "#888" },
  botaoFinalizar: { backgroundColor: "#00adf5" },
  textoBotaoAcao: { color: "#fff", fontWeight: "bold" },
  botaoDesabilitado: { opacity: 0.5 },
  tatuadorCard: {
    padding: 12, backgroundColor: "#3a3a3a", borderRadius: 8, marginBottom: 10
  },
  tatuadorNome: { fontSize: 16, color: "#fff" },
  listaVaziaTexto: { textAlign: "center", marginVertical: 20, color: "#ccc" },
  inputSenha: {
    borderWidth: 1, borderColor: "#555", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: "#fff", backgroundColor: "#333"
  },
  mensagemErroSenha: { color: "red", marginTop: 8, textAlign: "center" }
});
