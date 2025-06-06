import React, { useEffect, useState } from 'react';
import { db } from '../../firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';

const styles = {
  
container: {
  backgroundColor: '#1e1e1e',
  minHeight: '100vh',
  padding: 20,
  color: '#fff',
  fontFamily: 'Arial, sans-serif',
  boxSizing: 'border-box',
  overflowY: 'auto', // permite que a página role
},


listaProdutos: {
  overflowY: 'scroll',
  paddingRight: 10,
  paddingBottom: 100, // espaço extra no final
},


  botaoCadastrar: {
    backgroundColor: '#00adf5',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#fff',
    cursor: 'pointer',
    marginBottom: 20,
    border: 'none',
  },
  item: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  imagem: {
    width: 100,
    height: 100,
    objectFit: 'cover',
    borderRadius: 8,
  },
  detalhes: {
    flexGrow: 1,
  },
  nome: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  preco: {
    color: '#00adf5',
    marginTop: 4,
  },
  categoria: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  botaoIcone: {
    marginLeft: 10,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    color: '#00adf5',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitulo: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 12,
    width: '93%',
    border: '1px solid #444',
  },
  botaoSalvar: {
    backgroundColor: '#00adf5',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  botaoCancelar: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    border: '1px solid #888',
    color: '#fff',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    width: '100%',
  }
};

const ProdutosPage = () => {
  const [produtos, setProdutos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoAtual, setProdutoAtual] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    preco: '',
    imagem: '',
    categoria: '',
  });

  const produtosRef = collection(db, 'produtos');

  const carregarProdutos = async () => {
    const snapshot = await getDocs(produtosRef);
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProdutos(lista);
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const salvarProduto = async () => {
    if (produtoAtual) {
      const produtoDoc = doc(db, 'produtos', produtoAtual.id);
      await updateDoc(produtoDoc, form);
    } else {
      await addDoc(produtosRef, form);
    }
    setForm({ nome: '', preco: '', imagem: '', categoria: '' });
    setProdutoAtual(null);
    setModalAberto(false);
    carregarProdutos();
  };

  const excluirProduto = async id => {
    await deleteDoc(doc(db, 'produtos', id));
    carregarProdutos();
  };

  const editarProduto = produto => {
    setProdutoAtual(produto);
    setForm({
      nome: produto.nome,
      preco: produto.preco,
      imagem: produto.imagem,
      categoria: produto.categoria,
    });
    setModalAberto(true);
  };

  return (
    <div style={styles.container}>
      <h2>Produtos</h2>
      <button style={styles.botaoCadastrar} onClick={() => { setModalAberto(true); setProdutoAtual(null); }}>
        + Novo Produto
      </button>

      {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalTitulo}>
              {produtoAtual ? 'Editar Produto' : 'Novo Produto'}
            </div>
            <input
              style={styles.input}
              placeholder="Nome"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="Preço"
              value={form.preco}
              onChange={e => setForm({ ...form, preco: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="URL da Imagem"
              value={form.imagem}
              onChange={e => setForm({ ...form, imagem: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="Categoria"
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
            />
            <button style={styles.botaoSalvar} onClick={salvarProduto}>Salvar</button>
            <button style={styles.botaoCancelar} onClick={() => setModalAberto(false)}>Cancelar</button>
          </div>
        </div>
      )}

<div style={styles.listaProdutos}>
  {produtos.map(prod => (
    <div key={prod.id} style={styles.item}>
      <img src={prod.imagem} alt={prod.nome} style={styles.imagem} />
      <div style={styles.detalhes}>
        <div style={styles.nome}>{prod.nome}</div>
        <div style={styles.preco}>R$ {prod.preco}</div>
        <div style={styles.categoria}>{prod.categoria}</div>
      </div>
      <button style={styles.botaoIcone} onClick={() => editarProduto(prod)}>✏️</button>
      <button style={styles.botaoIcone} onClick={() => excluirProduto(prod.id)}>🗑️</button>
    </div>
  ))}
</div>

    </div>
  );
};

export default ProdutosPage;
