import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ClipboardList, Plus, Trash2, Pencil } from 'lucide-react-native';
import {
  deleteOrder,
  getOrders,
  OrderHeader,
} from '../lib/db/repo';

export default function OrderHistoryScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrders();
      setOrders(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Orders load nahi ho sake.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const handleDelete = (order: OrderHeader) => {
    if (!order.id) return;

    Alert.alert(
      'Delete Order',
      `Kya aap ${order.order_number} ko delete karna chahte hain?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrder(order.id!);
              await loadOrders();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Order delete nahi ho saka.');
            }
          },
        },
      ]
    );
  };

  const renderOrder = ({ item }: { item: OrderHeader }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/order-details?id=${item.id}`)}
    >
      <View style={styles.iconBox}>
        <ClipboardList size={22} strokeWidth={2.2} />
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.orderNumber}>
          {item.order_number}
        </Text>

        <Text style={styles.partyName}>
          {item.party_name}
        </Text>

        <Text style={styles.date}>
          {formatDate(item.order_date)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={(event) => {
            event.stopPropagation();
            router.push(`/order-details?id=${item.id}&edit=1`);
          }}
        >
          <Pencil size={18} strokeWidth={2} />
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={(event) => {
            event.stopPropagation();
            handleDelete(item);
          }}
        >
          <Trash2 size={18} strokeWidth={2} />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>
            {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
          </Text>
        </View>

        <Pressable
          style={styles.newButton}
          onPress={() => router.push('/order')}
        >
          <Plus size={19} color="#ffffff" strokeWidth={2.5} />
          <Text style={styles.newButtonText}>New Order</Text>
        </Pressable>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrder}
        contentContainerStyle={
          orders.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadOrders}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <ClipboardList size={48} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptyText}>
                Pehla Order banane ke liye
                {'\n'}“New Order” par tap karein.
              </Text>

              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/order')}
              >
                <Plus size={19} color="#ffffff" />
                <Text style={styles.emptyButtonText}>
                  Create Order
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    minHeight: 70,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#777777',
    fontSize: 13,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#222222',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 9,
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    padding: 14,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  partyName: {
    fontSize: 14,
    marginTop: 3,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    marginTop: 4,
    color: '#777777',
  },
  actions: {
    flexDirection: 'row',
    gap: 5,
    marginLeft: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f1f1',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#777777',
    lineHeight: 21,
    marginTop: 7,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#222222',
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 9,
    marginTop: 18,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
