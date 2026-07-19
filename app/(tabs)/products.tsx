import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, Pencil, Trash2, Search, Package, X, AlertTriangle, ChevronDown } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getAllProducts, getAllCategories, getAllSuppliers, addProduct, updateProduct, deleteProduct, searchProducts, UNITS, ProductWithDetails, Category } from '@/lib/db/repo';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';
import { Unit } from '@/lib/db/schema';

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await getAllProducts();
      setProducts(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (params.action === 'add') {
      setEditingProduct(null);
      setModalVisible(true);
    }
  }, [params.action]);

  const filtered = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.design_number || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.category_name || '').toLowerCase().includes(q) ||
      (p.color || '').toLowerCase().includes(q) ||
      (p.size || '').toLowerCase().includes(q)
    );
  });

  const handleDelete = (product: ProductWithDetails) => {
    Alert.alert('Delete Product', `Delete "${product.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProduct(product.id); load(); } },
    ]);
  };

  const formatCurrency = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Products" subtitle={`${products.length} items`} />
      <View style={styles.searchWrap}>
        <Search size={18} color={MD3Colors.outline} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, design #, barcode, category, color, size..."
          placeholderTextColor={MD3Colors.outline}
          value={search}
          onChangeText={setSearch}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><X size={18} color={MD3Colors.outline} /></TouchableOpacity> : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon={<Package size={48} color={MD3Colors.outline} />} title="No products yet" subtitle="Tap + to add your first bangle product" />}
        renderItem={({ item }) => {
          const isLowStock = item.total_stock <= (item.min_stock || 0) && (item.min_stock || 0) > 0;
          const isOutOfStock = item.total_stock <= 0;
          return (
            <View style={styles.productCard}>
              <TouchableOpacity
                style={styles.productMain}
                onPress={() => { setEditingProduct(item); setModalVisible(true); }}
              >
                <View style={styles.productIconWrap}>
                  <Package size={22} color={MD3Colors.primary} />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productCategory}>{item.category_name} · {item.unit}</Text>
                  {item.design_number ? <Text style={styles.productDesign}>Design: {item.design_number}</Text> : null}
                  <View style={styles.productMetaRow}>
                    <Text style={styles.productPrice}>Cost {formatCurrency(item.cost_price)}</Text>
                    <Text style={styles.productPrice}>Wholesale {formatCurrency(item.wholesale_price)}</Text>
                    <Text style={styles.productPrice}>Retail {formatCurrency(item.retail_price)}</Text>
                  </View>
                </View>
                <View style={[styles.stockBadge, isOutOfStock && styles.stockBadgeOut, isLowStock && !isOutOfStock && styles.stockBadgeLow]}>
                  <Text style={[styles.stockBadgeText, isOutOfStock && { color: MD3Colors.error }, isLowStock && !isOutOfStock && { color: MD3Colors.warning }]}>{item.total_stock}</Text>
                  <Text style={styles.stockBadgeLabel}>in stock</Text>
                  {isLowStock && !isOutOfStock ? <AlertTriangle size={12} color={MD3Colors.warning} /> : null}
                  {isOutOfStock ? <Text style={styles.outText}>OUT</Text> : null}
                </View>
              </TouchableOpacity>
              <View style={styles.productActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingProduct(item); setModalVisible(true); }}>
                  <Pencil size={16} color={MD3Colors.primary} /><Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                  <Trash2 size={16} color={MD3Colors.error} /><Text style={[styles.actionText, { color: MD3Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setEditingProduct(null); setModalVisible(true); }}>
        <Plus size={28} color={MD3Colors.onPrimary} />
      </TouchableOpacity>

      <ProductFormModal
        visible={modalVisible}
        product={editingProduct}
        onClose={() => { setModalVisible(false); setEditingProduct(null); }}
        onSaved={() => { setModalVisible(false); setEditingProduct(null); load(); }}
      />
    </View>
  );
}

function ProductFormModal({ visible, product, onClose, onSaved }: { visible: boolean; product: ProductWithDetails | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [designNumber, setDesignNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<Unit>('Piece');
  const [boxConversion, setBoxConversion] = useState('');
  const [dozenConversion, setDozenConversion] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [barcode, setBarcode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [notes, setNotes] = useState('');
  const [variants, setVariants] = useState<{ size: string; color: string; quantity: string }[]>([{ size: '', color: '', quantity: '' }]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOptions();
      if (product) {
        setName(product.name);
        setDesignNumber(product.design_number || '');
        setBrand(product.brand || '');
        setCategoryId(product.category_id);
        setSupplierId(product.supplier_id ?? null);
        setColor(product.color || '');
        setSize(product.size || '');
        setUnit(product.unit);
        setBoxConversion(String(product.box_conversion || ''));
        setDozenConversion(String(product.dozen_conversion || ''));
        setCostPrice(String(product.cost_price || ''));
        setWholesalePrice(String(product.wholesale_price || ''));
        setRetailPrice(String(product.retail_price || ''));
        setSalePrice(String(product.sale_price || ''));
        setMinStock(String(product.min_stock || ''));
        setBarcode(product.barcode || '');
        setQrCode(product.qr_code || '');
        setNotes(product.notes || '');
        setVariants(
          product.variants?.length
            ? product.variants.map((v: any) => ({ size: v.size || '', color: v.color || '', quantity: String(v.quantity || 0) }))
            : [{ size: '', color: '', quantity: '' }]
        );
      } else {
        setName(''); setDesignNumber(''); setBrand(''); setCategoryId(null); setSupplierId(null);
        setColor(''); setSize(''); setUnit('Piece'); setBoxConversion(''); setDozenConversion('');
        setCostPrice(''); setWholesalePrice(''); setRetailPrice(''); setSalePrice(''); setMinStock('');
        setBarcode(''); setQrCode(''); setNotes('');
        setVariants([{ size: '', color: '', quantity: '' }]);
      }
      setError('');
    }
  }, [visible, product]);

  const loadOptions = async () => {
    const [cats, sups] = await Promise.all([getAllCategories(), getAllSuppliers()]);
    setCategories(cats);
    setSuppliers(sups);
  };

  const updateVariant = (i: number, field: 'size' | 'color' | 'quantity', val: string) => {
    setVariants(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v));
  };
  const addVariant = () => setVariants(prev => [...prev, { size: '', color: '', quantity: '' }]);
  const removeVariant = (i: number) => setVariants(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!name.trim()) { setError('Product name is required'); return; }
    if (!categoryId) { setError('Category is required'); return; }
    const cleanVariants = variants
      .filter(v => v.size.trim() || v.color.trim() || v.quantity.trim())
      .map(v => ({ size: v.size.trim(), color: v.color.trim(), quantity: parseInt(v.quantity) || 0 }));
    setSaving(true);
    try {
      const productData = {
        name: name.trim(),
        design_number: designNumber.trim(),
        brand: brand.trim(),
        category_id: categoryId,
        supplier_id: supplierId,
        color: color.trim(),
        size: size.trim(),
        unit,
        box_conversion: parseFloat(boxConversion) || 0,
        dozen_conversion: parseFloat(dozenConversion) || 0,
        cost_price: parseFloat(costPrice) || 0,
        wholesale_price: parseFloat(wholesalePrice) || 0,
        retail_price: parseFloat(retailPrice) || 0,
        sale_price: parseFloat(salePrice) || 0,
        min_stock: parseInt(minStock) || 0,
        barcode: barcode.trim(),
        qr_code: qrCode.trim(),
        image: '',
        notes: notes.trim(),
      };
      if (product) {
        await updateProduct(product.id, productData, cleanVariants);
      } else {
        await addProduct(productData, cleanVariants);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{product ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 100 }}>
            <Input label="Product Name *" value={name} onChangeText={setName} placeholder="e.g. Red Toda 2-6" />
            <View style={styles.rowInputs}>
              <Input label="Design Number" value={designNumber} onChangeText={setDesignNumber} placeholder="e.g. D-1024" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. Crown" style={{ flex: 1 }} />
            </View>

            <Text style={styles.fieldLabel}>Category *</Text>
            <View style={styles.chipRow}>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, categoryId === c.id && styles.chipSelected]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={[styles.chipText, categoryId === c.id && styles.chipTextSelected]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowInputs}>
              <Input label="Color" value={color} onChangeText={setColor} placeholder="e.g. Red" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="Size" value={size} onChangeText={setSize} placeholder="e.g. 2-6" style={{ flex: 1 }} />
            </View>

            <Text style={styles.fieldLabel}>Unit</Text>
            <View style={styles.chipRow}>
              {UNITS.map(u => (
                <TouchableOpacity key={u} style={[styles.chip, unit === u && styles.chipSelected]} onPress={() => setUnit(u)}>
                  <Text style={[styles.chipText, unit === u && styles.chipTextSelected]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowInputs}>
              <Input label="Box Conversion" value={boxConversion} onChangeText={setBoxConversion} keyboardType="numeric" placeholder="e.g. 24" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="Dozen Conversion" value={dozenConversion} onChangeText={setDozenConversion} keyboardType="numeric" placeholder="e.g. 12" style={{ flex: 1 }} />
            </View>

            <View style={styles.rowInputs}>
              <Input label="Purchase Price (Rs)" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" placeholder="0" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="Wholesale Price (Rs)" value={wholesalePrice} onChangeText={setWholesalePrice} keyboardType="numeric" placeholder="0" style={{ flex: 1 }} />
            </View>
            <View style={styles.rowInputs}>
              <Input label="Retail Price (Rs)" value={retailPrice} onChangeText={setRetailPrice} keyboardType="numeric" placeholder="0" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="Sale Price (Rs)" value={salePrice} onChangeText={setSalePrice} keyboardType="numeric" placeholder="0" style={{ flex: 1 }} />
            </View>

            <View style={styles.rowInputs}>
              <Input label="Min Stock" value={minStock} onChangeText={setMinStock} keyboardType="numeric" placeholder="0" style={{ flex: 1, marginRight: MD3Spacing.sm }} />
              <Input label="Barcode" value={barcode} onChangeText={setBarcode} placeholder="Optional" style={{ flex: 1 }} />
            </View>

            <Input label="QR Code" value={qrCode} onChangeText={setQrCode} placeholder="Optional" />

            {suppliers.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Supplier (optional)</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, !supplierId && styles.chipSelected]} onPress={() => setSupplierId(null)}>
                    <Text style={[styles.chipText, !supplierId && styles.chipTextSelected]}>None</Text>
                  </TouchableOpacity>
                  {suppliers.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.chip, supplierId === s.id && styles.chipSelected]} onPress={() => setSupplierId(s.id)}>
                      <Text style={[styles.chipText, supplierId === s.id && styles.chipTextSelected]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.variantsHeader}>
              <Text style={styles.fieldLabel}>Stock Variants (Size / Color / Qty)</Text>
              <TouchableOpacity onPress={addVariant}><Plus size={20} color={MD3Colors.primary} /></TouchableOpacity>
            </View>
            {variants.map((v, i) => (
              <View key={i} style={styles.variantRow}>
                <TextInput style={[styles.variantInput, { flex: 1.2 }]} placeholder="Size" placeholderTextColor={MD3Colors.outline} value={v.size} onChangeText={t => updateVariant(i, 'size', t)} />
                <TextInput style={[styles.variantInput, { flex: 1.2 }]} placeholder="Color" placeholderTextColor={MD3Colors.outline} value={v.color} onChangeText={t => updateVariant(i, 'color', t)} />
                <TextInput style={[styles.variantInput, { flex: 1 }]} placeholder="Qty" placeholderTextColor={MD3Colors.outline} value={v.quantity} onChangeText={t => updateVariant(i, 'quantity', t)} keyboardType="numeric" />
                {variants.length > 1 && (
                  <TouchableOpacity onPress={() => removeVariant(i)} style={styles.variantRemove}>
                    <Trash2 size={16} color={MD3Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
              <Text style={styles.advancedToggleText}>Notes & Additional Info</Text>
              <ChevronDown size={18} color={MD3Colors.onSurfaceVariant} style={showAdvanced ? { transform: [{ rotate: '180deg' }] } : null} />
            </TouchableOpacity>
            {showAdvanced && (
              <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional product notes" multiline />
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button title="Cancel" variant="outlined" onPress={onClose} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title={product ? 'Update' : 'Save'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.full, paddingHorizontal: MD3Spacing.md, marginHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  searchInput: { flex: 1, fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurface, paddingVertical: MD3Spacing.sm + 2, paddingHorizontal: MD3Spacing.sm },
  productCard: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, marginBottom: MD3Spacing.md, ...MD3Elevation.level1, overflow: 'hidden' },
  productMain: { flexDirection: 'row', alignItems: 'center', padding: MD3Spacing.md },
  productIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: MD3Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  productInfo: { flex: 1 },
  productName: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  productCategory: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  productDesign: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 4 },
  productMetaRow: { flexDirection: 'row', gap: MD3Spacing.sm, flexWrap: 'wrap' },
  productPrice: { fontFamily: 'Roboto-Medium', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  stockBadge: { alignItems: 'center', paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.xs, borderRadius: MD3Radius.sm, minWidth: 60 },
  stockBadgeLow: { backgroundColor: MD3Colors.warningContainer },
  stockBadgeOut: { backgroundColor: MD3Colors.errorContainer },
  stockBadgeText: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.primary },
  stockBadgeLabel: { fontFamily: 'Roboto-Regular', fontSize: 10, color: MD3Colors.onSurfaceVariant },
  outText: { fontFamily: 'Roboto-Bold', fontSize: 9, color: MD3Colors.error, marginTop: 2 },
  productActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: MD3Spacing.sm, gap: 6 },
  actionText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.primary },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: MD3Colors.primary, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalBody: { padding: MD3Spacing.lg },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs, marginTop: MD3Spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  chip: { paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, borderRadius: MD3Radius.full, borderWidth: 1.5, borderColor: MD3Colors.outline, backgroundColor: MD3Colors.surface },
  chipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  chipText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  chipTextSelected: { color: MD3Colors.onPrimary },
  rowInputs: { flexDirection: 'row' },
  variantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  variantRow: { flexDirection: 'row', alignItems: 'center', gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  variantInput: { borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.sm, fontSize: 14, fontFamily: 'Roboto-Regular', color: MD3Colors.onSurface, backgroundColor: MD3Colors.surface },
  variantRemove: { padding: MD3Spacing.xs },
  advancedToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: MD3Spacing.sm, marginTop: MD3Spacing.sm, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
  advancedToggleText: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', padding: MD3Spacing.lg, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
});
