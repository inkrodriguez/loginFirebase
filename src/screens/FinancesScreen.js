import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function FinancesScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userEmail, setUserEmail] = useState('');

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatDate = (date) => {
    if (!(date instanceof Date)) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user && user.email) {
      setUserEmail(user.email);
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchTransactions();
    }
  }, [selectedMonth, selectedYear, userEmail]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const agendamentoRef = collection(db, 'agendamentos');
      const q = query(agendamentoRef, where('tatuador', '==', userEmail));
      const snapshot = await getDocs(q);

      const data = [];
      snapshot.forEach(doc => {
        const item = doc.data();

        let date;
        if (item.data) {
          if (typeof item.data === 'string') {
            date = new Date(item.data);
          } else if (item.data.toDate) {
            date = item.data.toDate();
          }
        }

        const month = date ? date.getMonth() + 1 : null;
        const year = date ? date.getFullYear() : null;

        if (month === selectedMonth && year === selectedYear && item.finalizado === true) {
          data.push({
            id: doc.id,
            title: item.nomeCliente || 'Cliente sem nome',
            amount: item.preco || 0,
            date: date ? formatDate(date) : '',
          });
        }
      });

      setTransactions(data);
    } catch (error) {
      console.log('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = transactions.reduce((acc, item) => acc + Number(item.amount), 0);

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <Text style={styles.income}>+ R$ {item.amount}</Text>
    </View>
  );

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Financeiro</Text>

      {/* Navegação entre meses com ano */}
      <View style={styles.monthNavigation}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Icon name="chevron-left" size={30} color="#6200ee" />
        </TouchableOpacity>

        <Text style={styles.currentMonth}>
          {monthNames[selectedMonth - 1]} {selectedYear}
        </Text>

        <TouchableOpacity onPress={goToNextMonth}>
          <Icon name="chevron-right" size={30} color="#6200ee" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Total de Entradas</Text>
        <Text style={styles.summaryIncome}>R$ {totalIncome.toFixed(2)}</Text>
      </View>

      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Ganhos</Text>
        <Text style={styles.transactionsCount}>
          {transactions.length} {transactions.length === 1 ? 'registro' : 'registros'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="info-outline" size={48} color="#999" />
              <Text style={styles.emptyText}>Sem ganhos neste mês.</Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchTransactions}
              >
                <Text style={styles.refreshButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#212121',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  currentMonth: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  summaryBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  summaryIncome: {
    color: '#00c853',
    fontSize: 28,
    fontWeight: 'bold',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  transactionsCount: {
    fontSize: 14,
    color: '#757575',
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  title: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  income: {
    color: '#00c853',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 12,
  },
  refreshButton: {
    marginTop: 16,
    backgroundColor: '#6200ee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});
