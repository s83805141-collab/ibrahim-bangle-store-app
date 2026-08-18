import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil, Trash2, Plus } from 'lucide-react-native';
import {
  getOrderById,
  updateOrder,
  deleteOrder,
  OrderItem,
  OrderWithItems,
} from '../lib/db/repo';

type EditableColour = {
  colour_name: string;
  gaddi: string;
  boxes_per_gaddi: string;
  qty_2: string;
  qty_22: string;
  qty_24: string;
  qty_26: string;
  qty_28: string;
};

type EditableItem = {
  product_id?: number | null;
  product_name: string;
  colours: EditableColour[];
};

const toEditable = (order: OrderWithItems): EditableItem[] =>
  order.items.map((item) => ({
    product_id: item.product_id ?? null,
    product_name: item.product_name,
    colours: item.colours.map((colour) => ({
      colour_name: colour.colour_name,
      gaddi: String(colour.gaddi || ''),
      boxes_per_gaddi: String(colour.boxes_per_gaddi || ''),
      qty_2: String(colour.qty_2 || ''),
      qty_22: String(colour.qty_22 || ''),
      qty_24: String(colour.qty_24 || ''),
      qty_26: String(colour.qty_26 || ''),
      qty_28: String(colour.qty_28 || ''),
    })),
  }));

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    edit?: string;
  }>();

  const orderId = Number(params.id);
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [editing, setEditing] = useState(params.edit === '1');
  const [partyName, setPartyName] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      const data = await getOrderById(orderId);

      if (!data) {
        Alert.alert('Error', 'Order nahi mila.');
        router.back();
        return;
      }

      setOrder(data);
      setPartyName(data.header.party_name);
      setNote(data.header.note || '');
      setItems(toEditable(data));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Order load nahi ho saka.');
    }
  }, [orderId, router]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const updateColour = (
    itemIndex: number,
    colourIndex: number,
    field: keyof EditableColour,
    value: string
  ) => {
    setItems((current) =>
      current.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              colours: item.colours.map((colour, index2) =>
                index2 === colourIndex
                  ? { ...colour, [field]: value }
                  : colour
              ),
            }
          : item
      )
    );
  };

  const addColour = (itemIndex: number) => {
    setItems((current) =>
      current.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              colours: [
                ...item.colours,
                {
                  colour_name: '',
                  gaddi: '',
                  boxes_per_gaddi: '',
                  qty_2: '',
                  qty_22: '',
                  qty_24: '',
                  qty_26: '',
                  qty_28: '',
                },
              ],
            }
          : item
      )
    );
  };

  const removeColour = (itemIndex: number, colourIndex: number) => {
    setItems((current) =>
      current.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              colours: item.colours.filter(
                (_, index2) => index2 !== colourIndex
              ),
            }
          : item
      )
    );
  };

  const saveChanges = async () => {
    if (!partyName.trim()) {
      Alert.alert('Required', 'Party Name enter karein.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Required', 'Order me kam se kam ek Product hona chahiye.');
      return;
    }

    for (const item of items) {
      if (!item.colours.length) {
        Alert.alert(
          'Required',
          `${item.product_name} me kam se kam ek Colour hona chahiye.`
        );
        return;
      }

      for (const colour of item.colours) {
        if (!colour.colour_name.trim()) {
          Alert.alert('Required', 'Colour Name enter karein.');
          return;
        }
      }
    }

    try {
      setSaving(true);

      await updateOrder(
        orderId,
        {
          order_number: order?.header.order_number || `ORD-${orderId}`,
          party_name: partyName.trim(),
          order_date: order?.header.order_date || Date.now(),
          note: note.trim(),
        },
        items.map((item) => ({
          product_id: item.product_id ?? null,
          product_name: item.product_name,
          colours: item.colours.map((colour) => ({
            colour_name: colour.colour_name,
            gaddi: Number(colour.gaddi) || 0,
            boxes_per_gaddi: Number(colour.boxes_per_gaddi) || 0,
            qty_2: Number(colour.qty_2) || 0,
            qty_22: Number(colour.qty_22) || 0,
            qty_24: Number(colour.qty_24) || 0,
            qty_26: Number(colour.qty_26) || 0,
            qty_28: Number(colour.qty_28) || 0,
          })),
        }))
      );

      Alert.alert('Success', 'Order update ho gaya.', [
        {
          text: 'OK',
          onPress: async () => {
            setEditing(false);
            await loadOrder();
          },
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Order update nahi ho saka.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Order',
      `Kya aap ${order?.header.order_number} delete karna chahte hain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrder(orderId);
              router.back();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Order delete nahi ho saka.');
            }
          },
        },
      ]
    );
  };

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Order load ho raha hai...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>
            {order.header.order_number}
          </Text>
          <Text style={styles.headerDate}>
            {formatDate(order.header.order_date)}
          </Text>
        </View>

        {!editing ? (
          <Pressable
            style={styles.iconButton}
            onPress={() => setEditing(true)}
          >
            <Pencil size={19} strokeWidth={2.2} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {editing ? (
          <>
            <Text style={styles.label}>Party Name</Text>

            <TextInput
              value={partyName}
              onChangeText={setPartyName}
              style={styles.input}
              placeholder="Party / Customer name"
            />

            <Text style={styles.label}>Note</Text>

            <TextInput
              value={note}
              onChangeText={setNote}
              style={[styles.input, styles.noteInput]}
              placeholder="Optional note"
              multiline
            />
          </>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Party Name</Text>
            <Text style={styles.infoValue}>
              {order.header.party_name}
            </Text>

            {order.header.note ? (
              <>
                <Text style={[styles.infoLabel, { marginTop: 12 }]}>
                  Note
                </Text>
                <Text style={styles.infoValue}>
                  {order.header.note}
                </Text>
              </>
            ) : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>Products</Text>

        {items.map((item, itemIndex) => (
          <View style={styles.productCard} key={itemIndex}>
            <Text style={styles.productName}>
              {item.product_name}
            </Text>

            {item.colours.map((colour, colourIndex) => (
              <View
                style={styles.colourCard}
                key={`${itemIndex}-${colourIndex}`}
              >
                {editing ? (
                  <TextInput
                    value={colour.colour_name}
                    onChangeText={(value) =>
                      updateColour(
                        itemIndex,
                        colourIndex,
                        'colour_name',
                        value
                      )
                    }
                    style={styles.input}
                    placeholder="Colour name"
                  />
                ) : (
                  <Text style={styles.colourName}>
                    {colour.colour_name}
                  </Text>
                )}

                <View style={styles.qtyRow}>
                  {(
                    [
                      ['2', 'qty_2'],
                      ['22', 'qty_22'],
                      ['24', 'qty_24'],
                      ['26', 'qty_26'],
                      ['28', 'qty_28'],
                    ] as const
                  ).map(([label, field]) => (
                    <View style={styles.qtyBox} key={field}>
                      <Text style={styles.qtyLabel}>{label}</Text>

                      {editing ? (
                        <TextInput
                          value={colour[field]}
                          onChangeText={(value) =>
                            updateColour(
                              itemIndex,
                              colourIndex,
                              field,
                              value.replace(/[^0-9.]/g, '')
                            )
                          }
                          keyboardType="numeric"
                          style={styles.qtyInput}
                        />
                      ) : (
                        <Text style={styles.qtyValue}>
                          {colour[field] || '0'}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                {editing && item.colours.length > 1 ? (
                  <Pressable
                    style={styles.removeColour}
                    onPress={() =>
                      removeColour(itemIndex, colourIndex)
                    }
                  >
                    <Trash2 size={15} strokeWidth={2} />
                    <Text style={styles.removeColourText}>
                      Remove Colour
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            {editing ? (
              <Pressable
                style={styles.addColour}
                onPress={() => addColour(itemIndex)}
              >
                <Plus size={17} strokeWidth={2.2} />
                <Text style={styles.addColourText}>
                  Add Colour
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {editing ? (
          <Pressable
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={saveChanges}
            disabled={saving}
          >
            <Text style={styles.saveText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.deleteButton}
            onPress={confirmDelete}
          >
            <Trash2 size={18} color="#ffffff" strokeWidth={2.2} />
            <Text style={styles.deleteButtonText}>
              Delete Order
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 60,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    fontSize: 36,
    lineHeight: 38,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerDate: {
    color: '#777777',
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  infoLabel: {
    color: '#777777',
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 15,
  },
  noteInput: {
    minHeight: 75,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  productName: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 7,
  },
  colourCard: {
    backgroundColor: '#fafafa',
    borderRadius: 9,
    padding: 9,
    marginTop: 7,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  colourName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  qtyBox: {
    flex: 1,
  },
  qtyLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  qtyInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 7,
    paddingVertical: 8,
    textAlign: 'center',
  },
  qtyValue: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eeeeee',
    borderRadius: 7,
    paddingVertical: 9,
    textAlign: 'center',
    fontWeight: '600',
  },
  addColour: {
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#bbbbbb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addColourText: {
    fontWeight: '700',
  },
  removeColour: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  removeColourText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    marginTop: 10,
    backgroundColor: '#222222',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: '#222222',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
