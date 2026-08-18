import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getAllProducts,
  addOrder,
  OrderItem,
} from '../lib/db/repo';

type Product = {
  id: number;
  name?: string;
  product_name?: string;
};

type ColourRow = {
  colour_name: string;
  gaddi: string;
  boxes_per_gaddi: string;
  qty_2: string;
  qty_22: string;
  qty_24: string;
  qty_26: string;
  qty_28: string;
};

const emptyColour = (): ColourRow => ({
  colour_name: '',
  gaddi: '',
  boxes_per_gaddi: '',
  qty_2: '',
  qty_22: '',
  qty_24: '',
  qty_26: '',
  qty_28: '',
});

export default function OrderScreen() {
  const router = useRouter();

  const [partyName, setPartyName] = useState('');
  const [note, setNote] = useState('');
  const [products, setProducts] = useState<OrderItem[]>([]);
  const [productModal, setProductModal] = useState(false);
  const [productList, setProductList] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    try {
      const result = await getAllProducts();
      setProductList(result as Product[]);
      setProductModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Products load nahi ho sake.');
    }
  };

  const addProduct = (product: Product) => {
    const name = product.name || product.product_name || 'Product';

    setProducts((current) => [
      ...current,
      {
        product_id: product.id,
        product_name: name,
        colours: [emptyColour() as any],
      },
    ]);

    setProductModal(false);
  };

  const removeProduct = (index: number) => {
    setProducts((current) => current.filter((_, i) => i !== index));
  };

  const addColour = (productIndex: number) => {
    setProducts((current) =>
      current.map((item, index) =>
        index === productIndex
          ? {
              ...item,
              colours: [...item.colours, emptyColour() as any],
            }
          : item
      )
    );
  };

  const removeColour = (productIndex: number, colourIndex: number) => {
    setProducts((current) =>
      current.map((item, index) =>
        index === productIndex
          ? {
              ...item,
              colours: item.colours.filter(
                (_, i) => i !== colourIndex
              ),
            }
          : item
      )
    );
  };

  const updateColour = (
    productIndex: number,
    colourIndex: number,
    field: keyof ColourRow,
    value: string
  ) => {
    setProducts((current) =>
      current.map((item, index) => {
        if (index !== productIndex) return item;

        return {
          ...item,
          colours: item.colours.map((colour: any, i: number) =>
            i === colourIndex
              ? { ...colour, [field]: value }
              : colour
          ),
        };
      })
    );
  };

  const saveOrder = async () => {
    if (!partyName.trim()) {
      Alert.alert('Required', 'Party Name enter karein.');
      return;
    }

    if (products.length === 0) {
      Alert.alert('Required', 'Kam se kam ek Product add karein.');
      return;
    }

    for (const product of products) {
      if (!product.colours.length) {
        Alert.alert(
          'Required',
          `${product.product_name} me kam se kam ek Colour add karein.`
        );
        return;
      }

      for (const colour of product.colours as any[]) {
        if (!colour.colour_name.trim()) {
          Alert.alert('Required', 'Colour Name enter karein.');
          return;
        }
      }
    }

    try {
      setSaving(true);

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

      const orderItems = products.map((product: any) => ({
        product_id: product.product_id ?? null,
        product_name: product.product_name,
        colours: product.colours.map((colour: any) => ({
          colour_name: colour.colour_name,
          gaddi: Number(colour.gaddi) || 0,
          boxes_per_gaddi: Number(colour.boxes_per_gaddi) || 0,
          qty_2: Number(colour.qty_2) || 0,
          qty_22: Number(colour.qty_22) || 0,
          qty_24: Number(colour.qty_24) || 0,
          qty_26: Number(colour.qty_26) || 0,
          qty_28: Number(colour.qty_28) || 0,
        })),
      }));

      await addOrder(
        {
          order_number: orderNumber,
          party_name: partyName.trim(),
          order_date: Date.now(),
          note: note.trim(),
        },
        orderItems
      );

      Alert.alert('Success', `Order ${orderNumber} save ho gaya.`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Order save nahi ho saka.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>

        <Text style={styles.title}>New Order</Text>

        <View style={{ width: 35 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Party Name</Text>

        <TextInput
          value={partyName}
          onChangeText={setPartyName}
          placeholder="Party / Customer name"
          style={styles.input}
        />

        <Text style={styles.label}>Note</Text>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          style={[styles.input, styles.noteInput]}
          multiline
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Products</Text>

          <Pressable style={styles.addButton} onPress={loadProducts}>
            <Text style={styles.addButtonText}>+ Product</Text>
          </Pressable>
        </View>

        {products.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Abhi koi Product add nahi hai.
            </Text>
          </View>
        ) : (
          products.map((product: any, productIndex) => (
            <View style={styles.productCard} key={`${product.product_id}-${productIndex}`}>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>
                  {product.product_name}
                </Text>

                <Pressable
                  onPress={() => removeProduct(productIndex)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>

              {product.colours.map((colour: any, colourIndex: number) => (
                <View
                  style={styles.colourCard}
                  key={`${productIndex}-${colourIndex}`}
                >
                  <View style={styles.colourHeader}>
                    <Text style={styles.colourTitle}>
                      Colour {colourIndex + 1}
                    </Text>

                    {product.colours.length > 1 && (
                      <Pressable
                        onPress={() =>
                          removeColour(productIndex, colourIndex)
                        }
                      >
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    )}
                  </View>

                  <TextInput
                    value={colour.colour_name}
                    onChangeText={(value) =>
                      updateColour(
                        productIndex,
                        colourIndex,
                        'colour_name',
                        value
                      )
                    }
                    placeholder="Colour name"
                    style={styles.input}
                  />

                  <View style={styles.detailsRow}>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Gaddi</Text>
                      <TextInput
                        value={colour.gaddi}
                        onChangeText={(value) =>
                          updateColour(
                            productIndex,
                            colourIndex,
                            'gaddi',
                            value.replace(/[^0-9.]/g, '')
                          )
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        style={styles.detailInput}
                      />
                    </View>

                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Boxes / Gaddi</Text>
                      <TextInput
                        value={colour.boxes_per_gaddi}
                        onChangeText={(value) =>
                          updateColour(
                            productIndex,
                            colourIndex,
                            'boxes_per_gaddi',
                            value.replace(/[^0-9.]/g, '')
                          )
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        style={styles.detailInput}
                      />
                    </View>
                  </View>

                  <View style={styles.qtyRow}>
                    {(['qty_2', 'qty_22', 'qty_24', 'qty_26', 'qty_28'] as const).map(
                      (field) => {
                        const label =
                          field === 'qty_2'
                            ? '2'
                            : field.replace('qty_', '');

                        return (
                          <View style={styles.qtyBox} key={field}>
                            <Text style={styles.qtyLabel}>{label}</Text>

                            <TextInput
                              value={colour[field]}
                              onChangeText={(value) =>
                                updateColour(
                                  productIndex,
                                  colourIndex,
                                  field,
                                  value.replace(/[^0-9.]/g, '')
                                )
                              }
                              keyboardType="numeric"
                              placeholder="0"
                              style={styles.qtyInput}
                            />
                          </View>
                        );
                      }
                    )}
                  </View>
                </View>
              ))}

              <Pressable
                style={styles.addColourButton}
                onPress={() => addColour(productIndex)}
              >
                <Text style={styles.addColourText}>+ Add Colour</Text>
              </Pressable>
            </View>
          ))
        )}

        <Pressable
          style={[styles.saveButton, saving && styles.disabled]}
          onPress={saveOrder}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving...' : 'Save Order'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={productModal}
        animationType="slide"
        transparent
        onRequestClose={() => setProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Product</Text>

              <Pressable onPress={() => setProductModal(false)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            <FlatList
              data={productList}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.productOption}
                  onPress={() => addProduct(item)}
                >
                  <Text style={styles.productOptionText}>
                    {item.name || item.product_name || 'Product'}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Koi Product nahi mila.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  back: {
    fontSize: 36,
    lineHeight: 38,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#222222',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777777',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e2e2',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
  },
  colourCard: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  colourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  colourTitle: {
    fontWeight: '700',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  detailBox: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 7,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  qtyBox: {
    flex: 1,
  },
  qtyLabel: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  qtyInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 7,
    paddingVertical: 8,
    textAlign: 'center',
  },
  addColourButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    borderColor: '#bbbbbb',
  },
  addColourText: {
    fontWeight: '700',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#222222',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modal: {
    backgroundColor: '#ffffff',
    maxHeight: '80%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  closeText: {
    fontWeight: '700',
  },
  productOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  productOptionText: {
    fontSize: 16,
  },
});
