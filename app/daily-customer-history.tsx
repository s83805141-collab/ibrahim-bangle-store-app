import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDailyCustomerEntries, deleteDailyCustomerEntry } from '@/lib/db/repo';

export default function DailyCustomerHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);

  const loadEntries = async () => {
    try {
      const data = await getDailyCustomerEntries();
      setEntries(data);
    } catch (error) {
      console.error('History load failed:', error);
      Alert.alert('Error', 'Customer history load nahi hui');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Customer History</Text>
        <Text style={styles.subtitle}>
          {entries.length} entries
        </Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Abhi koi entry nahi hai.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customer}>
                {item.customer_name}
              </Text>

              {item.mobile ? (
                <Text style={styles.detail}>{item.mobile}</Text>
              ) : null}

              <Text style={styles.detail}>
                Bill: ₹{Number(item.bill_amount || 0).toFixed(2)}
                {'  '}Paid: ₹{Number(item.paid_amount || 0).toFixed(2)}
              </Text>

              <Text style={styles.balance}>
                Balance: ₹{Number(item.balance_amount || 0).toFixed(2)}
              </Text>

              <Text style={styles.mode}>
                {item.payment_mode || 'Cash'}
              </Text>

              {item.items?.length > 0 ? (
                <View style={styles.productsBox}>
                  <Text style={styles.productsTitle}>Products Sold</Text>

                  {item.items.map((product: any, index: number) => (
                    <View key={`${product.id}-${index}`} style={styles.productRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>
                          {product.product_name || 'Product'}
                        </Text>

                        <Text style={styles.productDetail}>
                          {Number(product.quantity) || 0} {product.unit || 'Piece'}
                          {' × '}
                          ₹{(Number(product.unit_price) || 0).toFixed(2)}
                        </Text>
                      </View>

                      <Text style={styles.productTotal}>
                        ₹{(Number(product.total) || 0).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <Pressable
              style={styles.editButton}
              onPress={() =>
                router.push({
                  pathname: '/daily-customer-entry',
                  params: { editId: String(item.id) },
                })
              }
            >
              <Text style={styles.editText}>✏️ Edit</Text>
            </Pressable>
          <Pressable
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Delete Customer',
                `Kya aap ${item.customer_name} ki entry delete karna chahte hain?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteDailyCustomerEntry(Number(item.id));
                        await loadEntries();
                      } catch (error) {
                        console.error('Delete customer failed:', error);
                        Alert.alert('Error', 'Customer entry delete nahi hui');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 18,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    color: '#6B7280',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: '#6B7280',
    fontSize: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  customer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detail: {
    marginTop: 5,
    color: '#4B5563',
  },
  balance: {
    marginTop: 5,
    fontWeight: '700',
    color: '#DC2626',
  },
  mode: {
    marginTop: 5,
    color: '#2563EB',
    fontWeight: '600',
  },

  productsBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },

  productsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  productDetail: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },

  productTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 10,
  },
  editButton: {
    alignSelf: 'center',
    backgroundColor: '#EEF6FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginLeft: 10,
  },
  editText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  deleteButton: {
    alignSelf: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginLeft: 8,
  },
  deleteText: {
    color: '#DC2626',
    fontWeight: '700',
  },
});
