// src/screens/GerenciarTatuadores.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView
} from 'react-native';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  getDoc 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  getAuth, 
  deleteUser, 
  fetchSignInMethodsForEmail 
} from 'firebase/auth';
import { db } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function GerenciarTatuadores() {
  // Estados para listagem
  const [tatuadores, setTatuadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para cadastro
  const [modalCadastroVisible, setModalCadastroVisible] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [plano, setPlano] = useState('');
  const [limiteAgendamentosMensais, setLimiteAgendamentosMensais] = useState('');
  const [salvando, setSalvando] = useState(false);
  
  // Estados para edição
  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);
  const [tatuadorEditando, setTatuadorEditando] = useState(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [planoEdicao, setPlanoEdicao] = useState('');
  const [limiteEdicao, setLimiteEdicao] = useState('');

  // Buscar tatuadores do Firestore
  const buscarTatuadores = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'tatuadores'));
      const dados = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Ordenar por nome
      dados.sort((a, b) => a.nome.localeCompare(b.nome));
      
      setTatuadores(dados);
    } catch (error) {
      console.error('Erro ao buscar tatuadores:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de tatuadores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Confirmar exclusão de tatuador
  const confirmarExclusao = (id, nome) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir o tatuador ${nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => excluirTatuador(id) }
      ]
    );
  };

  // Excluir tatuador
  const excluirTatuador = async (id) => {
    try {
      await deleteDoc(doc(db, 'tatuadores', id));
      Alert.alert('Sucesso', 'Tatuador excluído com sucesso!');
      buscarTatuadores(); // Atualizar a lista
    } catch (error) {
      console.error('Erro ao excluir tatuador:', error);
      Alert.alert('Erro', 'Não foi possível excluir o tatuador.');
    }
  };

  // Atualizar lista com pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    buscarTatuadores();
  };

  // Cadastrar novo tatuador
  const handleCadastrar = async () => {
    // Validação dos campos
    if (!nome.trim() || !email.trim() || !senha.trim() || !confirmarSenha.trim() || !plano.trim() || !limiteAgendamentosMensais.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    // Validar se as senhas coincidem
    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    // Validar se a senha tem pelo menos 6 caracteres (requisito mínimo do Firebase)
    if (senha.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    // Validar se o limite é um número válido
    const limite = parseInt(limiteAgendamentosMensais);
    if (isNaN(limite) || limite < 0) {
      Alert.alert('Erro', 'O limite de agendamentos mensais deve ser um número positivo ou zero (0 = ilimitado).');
      return;
    }

    setSalvando(true);
    let authUser = null;
    let tatuadorDocRef = null;
    const emailFormatado = email.trim().toLowerCase();
    const auth = getAuth();

    try {
      // Verificar se o usuário já existe no Authentication
      const signInMethods = await fetchSignInMethodsForEmail(auth, emailFormatado);
      const usuarioJaExiste = signInMethods && signInMethods.length > 0;
      
      // Verificar se o tatuador já existe na coleção
      const tatuadoresRef = collection(db, 'tatuadores');
      const q = query(tatuadoresRef, where('email', '==', emailFormatado));
      const querySnapshot = await getDocs(q);
      const tatuadorJaExiste = !querySnapshot.empty;
      
      if (tatuadorJaExiste) {
        Alert.alert('Erro', 'Este email já está cadastrado como tatuador.');
        setSalvando(false);
        return;
      }
      
      // Se o usuário já existe no Authentication, pular a criação e usar o UID existente
      if (usuarioJaExiste) {
        console.log('Usuário já existe no Authentication, cadastrando apenas no Firestore');
        
        // Cadastrar na coleção tatuadores do Firestore sem UID (será associado posteriormente)
        const tatuadorDoc = await addDoc(collection(db, 'tatuadores'), {
          nome: nome.trim(),
          email: emailFormatado,
          plano: plano.trim(),
          limiteAgendamentosMensais: limite,
          criadoEm: new Date()
        });
        
        Alert.alert('Sucesso', 'Tatuador cadastrado com sucesso!');
      } else {
        // Criar usuário no Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, emailFormatado, senha);
        authUser = userCredential.user;
        
        // Cadastrar na coleção tatuadores do Firestore
        const tatuadorDoc = await addDoc(collection(db, 'tatuadores'), {
          uid: authUser.uid, // Armazenar o UID do Authentication para referência
          nome: nome.trim(),
          email: emailFormatado,
          plano: plano.trim(),
          limiteAgendamentosMensais: limite,
          criadoEm: new Date()
        });
        
        tatuadorDocRef = tatuadorDoc;
        
        Alert.alert('Sucesso', 'Tatuador cadastrado com sucesso no Authentication e no Firestore!');
      }
      
      // Limpar campos após cadastro
      setNome('');
      setEmail('');
      setSenha('');
      setConfirmarSenha('');
      setPlano('');
      setLimiteAgendamentosMensais('');
      setModalCadastroVisible(false);
      
      // Atualizar a lista de tatuadores
      buscarTatuadores();
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      
      // Tratamento de erros específicos do Firebase Authentication
      let mensagemErro = 'Não foi possível cadastrar o tatuador.';
      let prosseguirComCadastroFirestore = false;
      
      if (error.code === 'auth/email-already-in-use') {
        console.log('Email já em uso, tentando cadastrar apenas no Firestore');
        prosseguirComCadastroFirestore = true;
      } else if (error.code === 'auth/invalid-email') {
        mensagemErro = 'O formato do email é inválido.';
      } else if (error.code === 'auth/weak-password') {
        mensagemErro = 'A senha é muito fraca.';
      }
      
      // Se o email já está em uso, prosseguir com o cadastro apenas no Firestore
      if (prosseguirComCadastroFirestore) {
        try {
          // Verificar se o tatuador já existe na coleção
          const tatuadoresRef = collection(db, 'tatuadores');
          const q = query(tatuadoresRef, where('email', '==', emailFormatado));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            Alert.alert('Erro', 'Este email já está cadastrado como tatuador.');
            return;
          }
          
          // Cadastrar na coleção tatuadores do Firestore sem UID
          const tatuadorDoc = await addDoc(collection(db, 'tatuadores'), {
            nome: nome.trim(),
            email: emailFormatado,
            plano: plano.trim(),
            limiteAgendamentosMensais: limite,
            criadoEm: new Date()
          });
          
          Alert.alert('Sucesso', 'Tatuador cadastrado com sucesso!');
          
          // Limpar campos após cadastro
          setNome('');
          setEmail('');
          setSenha('');
          setConfirmarSenha('');
          setPlano('');
          setLimiteAgendamentosMensais('');
          setModalCadastroVisible(false);
          
          // Atualizar a lista de tatuadores
          buscarTatuadores();
          
          return;
        } catch (firestoreError) {
          console.error('Erro ao cadastrar no Firestore:', firestoreError);
          Alert.alert('Erro', 'Não foi possível cadastrar o tatuador no Firestore.');
          return;
        }
      }
      
      // Rollback: Se o usuário foi criado no Authentication mas falhou no Firestore
      if (authUser && !tatuadorDocRef) {
        try {
          // Tentar excluir o usuário criado no Authentication
          await deleteUser(authUser);
          console.log('Rollback: Usuário excluído do Authentication após falha no Firestore');
        } catch (rollbackError) {
          console.error('Erro ao fazer rollback do usuário:', rollbackError);
        }
      }
      
      Alert.alert('Erro', mensagemErro);
    } finally {
      setSalvando(false);
    }
  };

  // Abrir modal de edição com dados do tatuador
  const abrirModalEdicao = (tatuador) => {
    setTatuadorEditando(tatuador);
    setNomeEdicao(tatuador.nome || '');
    setPlanoEdicao(tatuador.plano || '');
    setLimiteEdicao(
      tatuador.limiteAgendamentosMensais !== undefined 
        ? tatuador.limiteAgendamentosMensais.toString() 
        : '0'
    );
    setModalEdicaoVisible(true);
  };

  // Salvar alterações do tatuador
  const salvarEdicao = async () => {
    // Validação dos campos
    if (!nomeEdicao.trim() || !planoEdicao.trim() || !limiteEdicao.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    // Validar se o limite é um número válido
    const limite = parseInt(limiteEdicao);
    if (isNaN(limite) || limite < 0) {
      Alert.alert('Erro', 'O limite de agendamentos mensais deve ser um número positivo ou zero (0 = ilimitado).');
      return;
    }

    setSalvando(true);
    try {
      const tatuadorRef = doc(db, 'tatuadores', tatuadorEditando.id);
      
      await updateDoc(tatuadorRef, {
        nome: nomeEdicao.trim(),
        plano: planoEdicao.trim(),
        limiteAgendamentosMensais: limite,
        atualizadoEm: new Date()
      });
      
      Alert.alert('Sucesso', 'Tatuador atualizado com sucesso!');
      setModalEdicaoVisible(false);
      buscarTatuadores(); // Atualizar a lista
    } catch (error) {
      console.error('Erro ao atualizar tatuador:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o tatuador.');
    } finally {
      setSalvando(false);
    }
  };

  // Carregar tatuadores ao montar o componente
  useEffect(() => {
    buscarTatuadores();
  }, []);

  // Renderizar item da lista de tatuadores
  const renderItem = ({ item }) => {
    // Determinar o texto do limite de agendamentos
    const limiteTexto = item.limiteAgendamentosMensais === 0 ? 
      'Ilimitado' : 
      `${item.limiteAgendamentosMensais} por mês`;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardNome}>{item.nome}</Text>
          <View style={styles.acoes}>
            <TouchableOpacity 
              onPress={() => abrirModalEdicao(item)}
              style={styles.botaoEditar}
            >
              <Icon name="edit" size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => confirmarExclusao(item.id, item.nome)}
              style={styles.botaoExcluir}
            >
              <Icon name="trash" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Icon name="envelope" size={16} color="#aaa" />
            <Text style={styles.cardTexto}> {item.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="id-card" size={16} color="#aaa" />
            <Text style={styles.cardTexto}> Plano: {item.plano}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="calendar" size={16} color="#aaa" />
            <Text style={styles.cardTexto}> Limite: {limiteTexto}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Tatuadores</Text>
        <TouchableOpacity 
          style={styles.botaoAdicionar}
          onPress={() => setModalCadastroVisible(true)}
        >
          <Icon name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#00adf5" style={styles.loading} />
      ) : (
        <FlatList
          data={tatuadores}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.mensagemVazia}>
              Nenhum tatuador cadastrado.
            </Text>
          }
        />
      )}

      {/* Modal de Cadastro */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalCadastroVisible}
        onRequestClose={() => setModalCadastroVisible(false)}
      >
        <View style={styles.modalFundo}>
          <ScrollView style={styles.modal}>
            <Text style={styles.tituloModal}>Cadastrar Tatuador</Text>

            <TextInput
              placeholder="Nome"
              placeholderTextColor="#aaa"
              value={nome}
              onChangeText={setNome}
              style={styles.input}
            />

            <TextInput
              placeholder="Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              placeholder="Senha (mínimo 6 caracteres)"
              placeholderTextColor="#aaa"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              placeholder="Confirmar Senha"
              placeholderTextColor="#aaa"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              placeholder="Plano"
              placeholderTextColor="#aaa"
              value={plano}
              onChangeText={setPlano}
              style={styles.input}
            />

            <TextInput
              placeholder="Limite de Agendamentos Mensais (0 = ilimitado)"
              placeholderTextColor="#aaa"
              value={limiteAgendamentosMensais}
              onChangeText={setLimiteAgendamentosMensais}
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.botoesContainer}>
              {salvando ? (
                <ActivityIndicator size="large" color="#00adf5" style={{ marginVertical: 10 }} />
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.botaoCadastrar}
                    onPress={handleCadastrar}
                  >
                    <Text style={styles.textoBotao}>Cadastrar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.botaoCancelar}
                    onPress={() => setModalCadastroVisible(false)}
                  >
                    <Text style={styles.textoBotao}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Edição */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEdicaoVisible}
        onRequestClose={() => setModalEdicaoVisible(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modal}>
            <Text style={styles.tituloModal}>Editar Tatuador</Text>

            <TextInput
              placeholder="Nome"
              placeholderTextColor="#aaa"
              value={nomeEdicao}
              onChangeText={setNomeEdicao}
              style={styles.input}
            />

            {tatuadorEditando && (
              <TextInput
                placeholder="Email"
                placeholderTextColor="#aaa"
                value={tatuadorEditando.email}
                style={[styles.input, { color: '#888' }]}
                editable={false} // Email não pode ser editado
              />
            )}

            <TextInput
              placeholder="Plano"
              placeholderTextColor="#aaa"
              value={planoEdicao}
              onChangeText={setPlanoEdicao}
              style={styles.input}
            />

            <TextInput
              placeholder="Limite de Agendamentos Mensais (0 = ilimitado)"
              placeholderTextColor="#aaa"
              value={limiteEdicao}
              onChangeText={setLimiteEdicao}
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.botoesContainer}>
              {salvando ? (
                <ActivityIndicator size="large" color="#00adf5" style={{ marginVertical: 10 }} />
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.botaoCadastrar}
                    onPress={salvarEdicao}
                  >
                    <Text style={styles.textoBotao}>Salvar Alterações</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.botaoCancelar}
                    onPress={() => setModalEdicaoVisible(false)}
                  >
                    <Text style={styles.textoBotao}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
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
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  botaoAdicionar: {
    backgroundColor: '#00adf5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lista: {
    padding: 16,
    paddingBottom: 100, // Espaço extra no final da lista
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  acoes: {
    flexDirection: 'row',
  },
  botaoEditar: {
    backgroundColor: '#2980b9',
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  botaoExcluir: {
    backgroundColor: '#c0392b',
    padding: 8,
    borderRadius: 4,
  },
  cardInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTexto: {
    color: '#ddd',
    fontSize: 14,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mensagemVazia: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 20,
    maxHeight: '90%',
  },
  tituloModal: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    color: '#fff',
    backgroundColor: '#1e1e1e',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  botoesContainer: {
    marginTop: 10,
  },
  botaoCadastrar: {
    backgroundColor: '#00adf5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  botaoCancelar: {
    backgroundColor: '#c0392b',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
