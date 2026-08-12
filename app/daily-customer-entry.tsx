import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react-native';

import {
  addSale,
  generateInvoiceNumber,
  getAllProducts,
  getDb,
  SaleHeader,
  SaleItemInput,
} from '@/lib/db/repo';
import type { Unit } from '@/lib/db/schema';
import { takePhoto } from '@/lib/imagePicker';
import { MD3Colors, MD3Radius, MD3Spacing } from '@/lib/theme';

type Product = any;

interface LineItem {
  productId: number | null;
  variantId: number | null;
  productName: string;
  quantity: string;
  unit: Unit;
  unitPrice: string;
}

export default function DailyCustomerEntryScreen() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      productId: null,
      variantId: null,
      productName: '',
      quantity: '',
      unit: 'Box',
      unitPrice: '',
    },
  ]);

  const [openProduct, setOpenProduct] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  const [paymentMode, setPaymentMode] =
    useState<'Cash' | 'UPI'>('Cash');

  const [paidAmount, setPaidAmount] = useState('');
  const [photo, setPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [successSaleId, setSuccessSaleId] = useState<number | null>(
    null
  );

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data || []);
    } catch (error) {
      console.error('Daily Customer products error:', error);
      Alert.alert('Error', 'Products load nahi ho sake.');
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    setLineItems(prev =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        productId: null,
        variantId: null,
        productName: '',
        quantity: '',
        unit: 'Box',
        unitPrice: '',
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;

    setLineItems(prev =>
      prev.filter((_, i) => i !== index)
    );
  };

  const selectProduct = (
    index: number,
    product: Product
  ) => {
    updateLineItem(index, 'productId', product.id);
    updateLineItem(index, 'variantId', null);
    updateLineItem(index, 'productName', product.name);
    updateLineItem(
      index,
      'unitPrice',
      String(product.sale_price || 0)
    );

    setOpenProduct(null);
    setSearchText('');
  };

  const selectVariant = (
    index: number,
    variant: any
  ) => {
    updateLineItem(index, 'variantId', variant.id);

    const product = products.find(
      p => p.id === lineItems[index].productId
    );

    if (product?.sale_price !== undefined) {
      updateLineItem(
        index,
        'unitPrice',
        String(product.sale_price || 0)
      );
    }
  };

  const lineTotal = (item: LineItem) =>
    (Number(item.quantity) || 0) *
    (Number(item.unitPrice) || 0);

  const total = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) => sum + lineTotal(item),
        0
      ),
    [lineItems]
  );

  const paid = Number(paidAmount) || 0;

  const balance = Math.max(
    0,
    total - paid
  );

  const filteredProducts = products.filter(product => {
    if (!searchText.trim()) return true;

    return String(product.name || '')
      .toLowerCase()
      .includes(searchText.toLowerCase());
  });

  const handleCamera = async () => {
    try {
      const uri = await takePhoto({
        quality: 0.7,
      });

      if (uri) {
        setPhoto(uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(
        'Camera Error',
        'Camera open nahi ho saka.'
      );
    }
  };

  const handleSave = async () => {
    if (!customerName.trim()) {
      Alert.alert(
        'Validation',
        'Customer Name required hai.'
      );
      return;
    }

    const validItems = lineItems.filter(
      item =>
        item.productId &&
        Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      Alert.alert(
        'Validation',
        'Kam se kam ek product aur quantity select karein.'
      );
      return;
    }

    if (paid > total) {
      Alert.alert(
        'Validation',
        'Paid amount total se zyada nahi ho sakta.'
      );
      return;
    }

    for (const item of validItems) {
      const product = products.find(
        p => p.id === item.productId
      );

      if (!product) {
        Alert.alert(
          'Error',
          `${item.productName} product nahi mila.`
        );
        return;
      }

      let stock: number | null = null;

      if (item.variantId) {
        const variant = product.variants?.find(
          (v: any) => v.id === item.variantId
        );

        if (variant) {
          stock = Number(variant.quantity || 0);
        }
      } else if (
        product.total_stock !== undefined
      ) {
        stock = Number(product.total_stock || 0);
      }

      if (
        stock !== null &&
        Number(item.quantity) > stock
      ) {
        Alert.alert(
          'Insufficient Stock',
          `${item.productName}\nAvailable: ${stock}\nRequired: ${item.quantity}`
        );
        return;
      }
    }

    setSaving(true);

    try {
      const invoiceNumber =
        await generateInvoiceNumber();

      const dateTs =
        new Date(`${date}T00:00:00`).getTime() ||
        Date.now();

      const items: SaleItemInput[] =
        validItems.map(item => ({
          product_id: item.productId!,
          variant_id: item.variantId,
          product_name: item.productName,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unitPrice) || 0,
          total: lineTotal(item),
        }));

      const header: SaleHeader = {
        invoice_number: invoiceNumber,
        customer_id: null,
        customer_name:
          customerName.trim(),
        is_walkin: true,
        date: dateTs,
        subtotal: total,
        discount: 0,
        discount_percent: 0,
        extra_charges: 0,
        grand_total: total,
        amount_received: paid,
        balance_due: balance,
        payment_method: paymentMode,
        transaction_number: '',
        note: 'Daily Customer',
        payment_date: dateTs,
        payment_time: new Date()
          .toTimeString()
          .slice(0, 5),
        upi_id: '',
        bank_account_id: null,
        reference_number: '',
        payment_screenshot: '',
      };

      /*
       * IMPORTANT:
       * addSale() is called ONLY ONCE.
       * Therefore stock will be reduced ONLY ONCE.
       */
      const savedId = await addSale(
        header,
        items
      );

      /*
       * Daily customer information is saved separately.
       * This does NOT touch stock.
       */
      try {
        const db = await getDb();

        await db.exec(
          `INSERT INTO daily_customer_entries
          (
            customer_name,
            mobile,
            bill_no,
            bill_amount,
            paid_amount,
            balance_amount,
            payment_mode,
            payment_status,
            bill_photo,
            payment_photo,
            notes,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customerName.trim(),
            mobile.trim(),
            invoiceNumber,
            total,
            paid,
            balance,
            paymentMode,
            balance > 0
              ? 'Pending'
              : 'Paid',
            photo || '',
            '',
            'Created from Daily Customer',
            Date.now(),
            Date.now(),
          ]
        );
      } catch (dbError) {
        /*
         * Sale is already saved successfully.
         * Do not call addSale again.
         */
        console.error(
          'Daily customer entry save error:',
          dbError
        );
      }

      setSuccessSaleId(savedId);
    } catch (error: any) {
      console.error(
        'Daily Customer save error:',
        error
      );

      Alert.alert(
        'Save Failed',
        error?.message ||
          'Bill save nahi ho saka.'
      );
    } finally {
      setSaving(false);
    }
  };

  const generateBill = () => {
    if (!successSaleId) return;

    router.push({
      pathname: '/invoice',
      params: {
        saleId: String(successSaleId),
      },
    });
  };

  const resetForm = () => {
    setCustomerName('');
    setMobile('');
    setDate(
      new Date().toISOString().split('T')[0]
    );
    setLineItems([
      {
        productId: null,
        variantId: null,
        productName: '',
        quantity: '',
        unit: 'Box',
        unitPrice: '',
      },
    ]);
    setPaidAmount('');
    setPaymentMode('Cash');
    setPhoto('');
    setSuccessSaleId(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          Daily Customer
        </Text>

        <Text style={styles.subtitle}>
          Record daily customer bills
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Customer Details
          </Text>

          <Text style={styles.label}>
            Customer Name *
          </Text>

          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Enter customer name"
          />

          <Text style={styles.label}>
            Mobile
          </Text>

          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>
            Date
          </Text>

          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Items
            </Text>

            <TouchableOpacity
              style={styles.addItemButton}
              onPress={addLineItem}
            >
              <Plus
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.addItemText}>
                Add Item
              </Text>
            </TouchableOpacity>
          </View>

          {lineItems.map(
            (item, index) => {
              const product =
                products.find(
                  p =>
                    p.id ===
                    item.productId
                );

              return (
                <View
                  key={index}
                  style={styles.itemBox}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>
                      Item {index + 1}
                    </Text>

                    {lineItems.length > 1 && (
                      <TouchableOpacity
                        onPress={() =>
                          removeLineItem(index)
                        }
                      >
                        <Trash2
                          size={20}
                          color={
                            MD3Colors.error
                          }
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.productSelector}
                    onPress={() =>
                      setOpenProduct(
                        openProduct ===
                          index
                          ? null
                          : index
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.productSelectorText,
                        !item.productName &&
                          styles.placeholder,
                      ]}
                    >
                      {item.productName ||
                        'Select Product'}
                    </Text>

                    {openProduct ===
                    index ? (
                      <ChevronUp
                        size={20}
                        color={
                          MD3Colors
                            .onSurfaceVariant
                        }
                      />
                    ) : (
                      <ChevronDown
                        size={20}
                        color={
                          MD3Colors
                            .onSurfaceVariant
                        }
                      />
                    )}
                  </TouchableOpacity>

                  {openProduct ===
                    index && (
                    <View
                      style={
                        styles.dropdown
                      }
                    >
                      <TextInput
                        style={
                          styles.searchInput
                        }
                        value={
                          searchText
                        }
                        onChangeText={
                          setSearchText
                        }
                        placeholder="Search product..."
                      />

                      <ScrollView
                        style={
                          styles.productList
                        }
                        nestedScrollEnabled
                      >
                        {filteredProducts.map(
                          p => (
                            <TouchableOpacity
                              key={p.id}
                              style={
                                styles.productOption
                              }
                              onPress={() =>
                                selectProduct(
                                  index,
                                  p
                                )
                              }
                            >
                              <View
                                style={{
                                  flex: 1,
                                }}
                              >
                                <Text
                                  style={
                                    styles.productName
                                  }
                                >
                                  {p.name}
                                </Text>

                                <Text
                                  style={
                                    styles.stockText
                                  }
                                >
                                  Stock:{' '}
                                  {p.total_stock ??
                                    0}
                                </Text>
                              </View>

                              <Text
                                style={
                                  styles.priceText
                                }
                              >
                                ₹
                                {p.sale_price ||
                                  0}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </ScrollView>
                    </View>
                  )}

                  {product?.variants?.length >
                    0 && (
                    <View
                      style={
                        styles.variantContainer
                      }
                    >
                      <Text
                        style={styles.smallLabel}
                      >
                        Variant
                      </Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={
                          false
                        }
                      >
                        {product.variants.map(
                          (variant: any) => (
                            <TouchableOpacity
                              key={
                                variant.id
                              }
                              style={[
                                styles.variantButton,
                                item.variantId ===
                                  variant.id &&
                                  styles.variantSelected,
                              ]}
                              onPress={() =>
                                selectVariant(
                                  index,
                                  variant
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.variantText,
                                  item.variantId ===
                                    variant.id &&
                                    styles.variantSelectedText,
                                ]}
                              >
                                {variant.size ||
                                  variant.label ||
                                  '-'}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </ScrollView>
                    </View>
                  )}

                  <View
                    style={styles.row}
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.smallLabel
                        }
                      >
                        Quantity
                      </Text>

                      <TextInput
                        style={
                          styles.input
                        }
                        value={
                          item.quantity
                        }
                        onChangeText={value =>
                          updateLineItem(
                            index,
                            'quantity',
                            value.replace(
                              /[^0-9]/g,
                              ''
                            )
                          )
   
