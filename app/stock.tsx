import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Boxes, AlertTriangle, Plus, X, ArrowUpRight, ArrowDownLeft, Search, History, Package } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import {
  getAllProducts, getLowStockProducts, getOutOfStockProducts, getAllStockMovements,
  adjustStock, UNITS,
  ProductWithDetails, StockMovement, StockMovementType,
} from '@/lib/db/repo';
import { Unit } from '@/lib/db/schema';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';

type Tab = 'overview' | 'lowstock' | 'history';

export default function StockScreen() {
  const [tab, setTab] = useState<Tab>('overview');
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [lowStock, setLowStock] = useState<ProductWithDetails[]>([]);
  const [outOfStock, setOutOfStock] = useState<ProductWithDetails[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<ProductWithDetails | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [all, low, out, moves] = await Promise.all([
        getAllProducts(), getLowStockProducts(), getOutOfStockProducts(), getAllStockMovements(),
      ]);
      setProducts(all); setLowStock(low); setOutOfStock(out); setMovements(moves);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const formatCurrency = (n: number) => 'Rs ' + (n || 0).toLocaleString('en-PK');
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const filteredProducts = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.design_number || '').toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q);
  });

  const totalStockValue = products.reduce((s, p) => s + (p.total_stock || 0) * (p.cost_price || 0), 0);

  const movementIcon = (type: StockMovementType) => {
    const isIncrease = type === 'purchase' || type === 'return' || type === 'adjustment';
    return isIncrease ? <ArrowUpRight size={18} color={MD3Colors.success} /> : <ArrowDownLeft size={18} color={MD3Colors.error} />;
  };
  const movementColor = (type: StockMovementType) => {
    return (type === 'purchase' || type === 'return' || type === 'adjustment') ? MD3Colors.success : MD3Colors.error;
  };
  const movementSign = (type: StockMovementType) => {
    return (type === 'purchase' || type === 'return' || type === 'adjustment') ? '+' : '-';
  };
  const movementLabel = (type: StockMovementType) => {
    const labels: Record<StockMovementType, string> = {
      purchase: 'Purchase', sale: 'Sale', return: 'Return', damage: 'Damage', adjustment: 'Adjustment',
    };
    return labels[type] || type;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Stock Management" subtitle="View & adjust inventory" />

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: MD3Colors.primaryContainer }]}>
          <Text style={styles.statLabel}>Total Items</Text>
          <Text style={[styles.statValue, { color: MD3Colors.primary }]}>{products.length}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: MD3Colors.successContainer }]}>
          <Text style={styles.statLabel}>Stock Value</Text>
          <Text style={[styles.statValue, { color: MD3Colors.success }]}>{formatCurrency(totalStockValue)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: MD3Colors.warningContainer }]}>
          <Text style={styles.statLabel}>Low Stock</Text>
          <Text style={[styles.statValue, { color: MD3Colors.warning }]}>{lowStock.length}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: MD3Colors.errorContainer }]}>
          <Text style={styles.statLabel}>Out of Stock</Text>
          <Text style={[styles.statValue, { color: MD3Colors.error }]}>{outOfStock.length}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'overview' && styles.tabActive]} onPress={() => setTab('overview')}>
          <Text style={[styles.tabText, tab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'lowstock' && styles.tabActive]} onPress={() => setTab('lowstock')}>
          <Text style={[styles.tabText, tab === 'lowstock' && styles.tabTextActive]}>Low Stock</Text>
          {lowStock.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{lowStock.length}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {tab !== 'history' && (
        <View style={styles.searchWrap}>
          <Search size={18} color={MD3Colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={MD3Colors.outline}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      <FlatList
        data={tab === 'history' ? movements : (tab === 'lowstock' ? [...outOfStock, ...lowStock] : filteredProducts)}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          tab === 'history' ? (
            <EmptyState icon={<History size={48} color={MD3Colors.outline} />} title="No stock movements" subtitle="Stock changes will appear here" />
          ) : tab === 'lowstock' ? (
            <EmptyState icon={<AlertTriangle size={48} color={MD3Colors.success} />} title="No low stock alerts" subtitle="All products are well stocked" />
          ) : (
            <EmptyState icon={<Boxes size={48} color={MD3Colors.outline} />} title="No products" subtitle="Add products to see inventory" />
          )
        }
        renderItem={({ item }: { item: any }) => tab === 'history' ? (
          <View style={styles.movementCard}>
            <View style={[styles.movementIconWrap, { backgroundColor: movementColor(item.type) === MD3Colors.success ? MD3Colors.successContainer : MD3Colors.errorContainer }]}>
              {movementIcon(item.type)}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.movementProduct}>{item.product_name || 'Unknown'}</Text>
              <Text style={styles.movementMeta}>{movementLabel(item.type)} · {formatDate(item.date)}</Text>
              {item.note ? <Text style={styles.movementNote}>{item.note}</Text> : null}
            </View>
            <Text style={[styles.movementQty, { color: movementColor(item.type) }]}>
              {movementSign(item.type)}{item.quantity} {item.unit}
            </Text>
          </View>
        ) : (
          <View style={styles.stockCard}>
            <View style={styles.stockMain}>
              <View style={styles.stockIconWrap}><Package size={20} color={MD3Colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stockName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.stockCategory}>{item.category_name}{item.design_number ? ` · ${item.design_number}` : ''}</Text>
                <Text style={styles.stockMin}>Min: {item.min_stock || 0} {item.unit}</Text>
              </View>
              <View style={[styles.stockBadge, item.total_stock <= 0 ? styles.stockBadgeOut : (item.total_stock <= (item.min_stock || 0) && (item.min_stock || 0) > 0) ? styles.stockBadgeLow : styles.stockBadgeOk]}>
                {item.total_stock <= (item.min_stock || 0) && (item.min_stock || 0) > 0 && item.total_stock > 0 && <AlertTriangle size={14} color={MD3Colors.warning} />}
                <Text style={[styles.stockBadgeText, item.total_stock <= 0 ? { color: MD3Colors.error } : (item.total_stock <= (item.min_stock || 0) && (item.min_stock || 0) > 0) ? { color: MD3Colors.warning } : { color: MD3Colors.success }]}>{item.total_stock}</Text>
              </View>
            </View>
            <View style={styles.stockActions}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => setAdjustModal(item)}>
                <Plus size={14} color={MD3Colors.primary} /><Text style={styles.adjustBtnText}>Adjust Stock</Text>
              </TouchableOpacity>
              <Text style={styles.stockValue}>Value: {formatCurrency((item.total_stock || 0) * (item.cost_price || 0))}</Text>
            </View>
          </View>
        )}
      />

      <StockAdjustModal
        product={adjustModal}
        onClose={() => setAdjustModal(null)}
        onSaved={() => { setAdjustModal(null); load(); }}
      />
    </View>
  );
}

function StockAdjustModal({ product, onClose, onSaved }: { product: ProductWithDetails | null; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<StockMovementType>('adjustment');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('Piece');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!product) return;
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) { setError('Enter a valid quantity'); return; }
    if (type === 'damage' && qty > product.total_stock) {
      Alert.alert('Insufficient Stock', `Only ${product.total_stock} ${unit} available. Negative stock is not allowed.`);
      return;
    }
    setSaving(true);
    try {
      await adjustStock(product.id, null, type, qty, unit, note.trim() || `${type} adjustment`);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setType('adjustment'); setQuantity(''); setUnit('Piece'); setNote(''); setError('');
    onClose();
  };

  if (!product) return null;

  const movementTypes: { type: StockMovementType; label: string; desc: string; color: any }[] = [
    { type: 'purchase', label: 'Purchase (+)', desc: 'Add stock', color: MD3Colors.success },
    { type: 'return', label: 'Return (+)', desc: 'Customer return', color: MD3Colors.success },
    { type: 'damage', label: 'Damage (-)', desc: 'Damaged stock', color: MD3Colors.error },
    { type: 'adjustment', label: 'Adjustment', desc: 'Manual correction', color: MD3Colors.primary },
  ];

  return (
    <Modal visible={!!product} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Adjust Stock</Text>
              <Text style={styles.modalSubtitle}>{product.name}</Text>
            </View>
            <TouchableOpacity onPress={handleClose}><X size={24} color={MD3Colors.onSurface} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.currentStockBox}>
              <Text style={styles.currentStockLabel}>Current Stock</Text>
              <Text style={styles.currentStockValue}>{product.total_stock} {product.unit}</Text>
            </View>

            <Text style={styles.fieldLabel}>Movement Type</Text>
            <View style={styles.typeGrid}>
              {movementTypes.map(mt => (
                <TouchableOpacity
                  key={mt.type}
                  style={[styles.typeCard, type === mt.type && { backgroundColor: mt.color, borderColor: mt.color }]}
                  onPress={() => setType(mt.type)}
                >
                  <Text style={[styles.typeLabel, type === mt.type && { color: MD3Colors.onPrimary }]}>{mt.label}</Text>
                  <Text style={[styles.typeDesc, type === mt.type && { color: MD3Colors.onPrimary }]}>{mt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: MD3Spacing.sm }}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput
                  style={styles.qtyInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={MD3Colors.outline}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <View style={styles.unitRow}>
                  {UNITS.map(u => (
                    <TouchableOpacity key={u} style={[styles.unitChip, unit === u && styles.unitChipSelected]} onPress={() => setUnit(u)}>
                      <Text style={[styles.unitChipText, unit === u && styles.unitChipTextSelected]}>{u[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Input label="Note" value={note} onChangeText={setNote} placeholder="Reason for adjustment" multiline />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button title="Cancel" variant="outlined" onPress={handleClose} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title="Save Adjustment" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  statsRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, gap: MD3Spacing.sm, marginBottom: MD3Spacing.sm },
  statCard: { flex: 1, borderRadius: MD3Radius.md, padding: MD3Spacing.sm, ...MD3Elevation.level1 },
  statLabel: { fontFamily: 'Roboto-Regular', fontSize: 10, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  statValue: { fontFamily: 'Roboto-Bold', fontSize: 16 },
  tabRow: { flexDirection: 'row', paddingHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: MD3Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 4 },
  tabActive: { borderBottomColor: MD3Colors.primary },
  tabText: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  tabTextActive: { color: MD3Colors.primary },
  tabBadge: { backgroundColor: MD3Colors.warning, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  tabBadgeText: { fontFamily: 'Roboto-Bold', fontSize: 10, color: MD3Colors.onPrimary },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.full, paddingHorizontal: MD3Spacing.md, marginHorizontal: MD3Spacing.lg, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  searchInput: { flex: 1, fontFamily: 'Roboto-Regular', fontSize: 14, color: MD3Colors.onSurface, paddingVertical: MD3Spacing.sm + 2, paddingHorizontal: MD3Spacing.sm },
  stockCard: { backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1, overflow: 'hidden' },
  stockMain: { flexDirection: 'row', alignItems: 'center', padding: MD3Spacing.md },
  stockIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: MD3Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  stockName: { fontFamily: 'Roboto-Bold', fontSize: 15, color: MD3Colors.onSurface, marginBottom: 2 },
  stockCategory: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 2 },
  stockMin: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: MD3Spacing.sm, paddingVertical: MD3Spacing.xs, borderRadius: MD3Radius.sm, minWidth: 50 },
  stockBadgeOk: { backgroundColor: MD3Colors.successContainer },
  stockBadgeLow: { backgroundColor: MD3Colors.warningContainer },
  stockBadgeOut: { backgroundColor: MD3Colors.errorContainer },
  stockBadgeText: { fontFamily: 'Roboto-Bold', fontSize: 18 },
  stockActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: MD3Spacing.md, paddingBottom: MD3Spacing.sm, gap: MD3Spacing.sm },
  adjustBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: MD3Colors.primaryContainer, borderRadius: MD3Radius.full, paddingHorizontal: MD3Spacing.md, paddingVertical: 6 },
  adjustBtnText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.primary },
  stockValue: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  movementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  movementIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.sm },
  movementProduct: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  movementMeta: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  movementNote: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant, fontStyle: 'italic', marginTop: 2 },
  movementQty: { fontFamily: 'Roboto-Bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  modalSubtitle: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant, marginTop: 2 },
  modalBody: { padding: MD3Spacing.lg },
  currentStockBox: { backgroundColor: MD3Colors.surfaceVariant, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.md, alignItems: 'center' },
  currentStockLabel: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: 4 },
  currentStockValue: { fontFamily: 'Roboto-Bold', fontSize: 24, color: MD3Colors.onSurface },
  fieldLabel: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant, marginBottom: MD3Spacing.xs },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MD3Spacing.sm, marginBottom: MD3Spacing.md },
  typeCard: { flex: 1, minWidth: '45%', borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.md, padding: MD3Spacing.sm, backgroundColor: MD3Colors.surface },
  typeLabel: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurface, marginBottom: 2 },
  typeDesc: { fontFamily: 'Roboto-Regular', fontSize: 11, color: MD3Colors.onSurfaceVariant },
  rowInputs: { flexDirection: 'row', marginBottom: MD3Spacing.sm },
  qtyInput: { borderWidth: 1.5, borderColor: MD3Colors.outline, borderRadius: MD3Radius.sm, paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, fontSize: 16, fontFamily: 'Roboto-Regular', color: MD3Colors.onSurface, backgroundColor: MD3Colors.surface },
  unitRow: { flexDirection: 'row', gap: 4 },
  unitChip: { flex: 1, height: 48, borderRadius: 6, borderWidth: 1.5, borderColor: MD3Colors.outline, justifyContent: 'center', alignItems: 'center', backgroundColor: MD3Colors.surface },
  unitChipSelected: { backgroundColor: MD3Colors.primary, borderColor: MD3Colors.primary },
  unitChipText: { fontFamily: 'Roboto-Bold', fontSize: 14, color: MD3Colors.onSurfaceVariant },
  unitChipTextSelected: { color: MD3Colors.onPrimary },
  errorText: { fontFamily: 'Roboto-Medium', fontSize: 13, color: MD3Colors.error, marginTop: MD3Spacing.sm },
  modalFooter: { flexDirection: 'row', padding: MD3Spacing.lg, borderTopWidth: 1, borderTopColor: MD3Colors.outlineVariant },
});
