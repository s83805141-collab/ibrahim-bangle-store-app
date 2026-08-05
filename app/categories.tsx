import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, Trash2, Tag, Package, AlertTriangle } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getAllCategories, getAllProducts, addCategory, deleteCategory, Category, ProductWithDetails } from '@/lib/db/repo';
import { Button, Input, EmptyState, ScreenHeader, FAB, PremiumModal, StatusBadge } from '@/components/ui';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([getAllCategories(), getAllProducts()]);
      setCategories(cats);
      setProducts(prods);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const productCount = (catId: number) => products.filter(p => p.category_id === catId).length;
  const stockCount = (catId: number) => products.filter(p => p.category_id === catId).reduce((s, p) => s + (p.total_stock || 0), 0);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await addCategory(newName.trim(), newDesc.trim());
      setNewName(''); setNewDesc(''); setModalVisible(false); load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: Category) => {
    const count = productCount(cat.id);
    Alert.alert(
      'Delete Category',
      count > 0 ? `"${cat.name}" has ${count} products. Delete anyway?` : `Delete "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCategory(cat.id); load(); } },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Categories" subtitle={`${categories.length} categories`} />
      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: MD3Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon={<Tag size={48} color={MD3Colors.outline} />} title="No categories" subtitle="Categories will appear here" />}
        renderItem={({ item, index }) => {
          const count = productCount(item.id);
          const stock = stockCount(item.id);
          const isLow = count > 0 && stock === 0;
          return (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 50)} style={styles.catCard}>
              <View style={styles.catTop}>
                <View style={styles.catIconWrap}>
                  <Tag size={22} color={MD3Colors.tertiary} />
                </View>
                <View style={styles.catInfo}>
                  <Text style={styles.catName} numberOfLines={1}>{item.name}</Text>
                  {item.description ? <Text style={styles.catDesc} numberOfLines={1}>{item.description}</Text> : null}
                </View>
                <StatusBadge
                  label={count === 0 ? 'Empty' : `${count} items`}
                  color={count === 0 ? MD3Colors.onSurfaceVariant : MD3Colors.tertiary}
                  bg={count === 0 ? MD3Colors.surfaceVariant : MD3Colors.tertiaryContainer}
                />
              </View>
              <View style={styles.catDivider} />
              <View style={styles.catBottom}>
                <View style={styles.catStat}>
                  <Package size={14} color={MD3Colors.primary} />
                  <Text style={styles.catStatText}>{count} products</Text>
                </View>
                <View style={styles.catStat}>
                  {isLow ? <AlertTriangle size={14} color={MD3Colors.warning} /> : <Package size={14} color={MD3Colors.success} />}
                  <Text style={[styles.catStatText, isLow && { color: MD3Colors.warning }]}>{stock} in stock</Text>
                </View>
                <TouchableOpacity style={styles.catDelete} onPress={() => handleDelete(item)}>
                  <Trash2 size={16} color={MD3Colors.error} />
                  <Text style={styles.catDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        }}
      />

      <FAB onPress={() => setModalVisible(true)} icon={Plus} intent="add" />

      <PremiumModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setNewName(''); setNewDesc(''); }}
        title="Add Category"
        footer={
          <>
            <Button title="Cancel" variant="outlined" intent="cancel" onPress={() => { setModalVisible(false); setNewName(''); setNewDesc(''); }} style={{ flex: 1, marginRight: MD3Spacing.sm }} />
            <Button title="Add Category" intent="add" onPress={handleAdd} loading={saving} style={{ flex: 1 }} />
          </>
        }
      >
        <View style={styles.modalIconWrap}>
          <Tag size={32} color={MD3Colors.tertiary} />
        </View>
        <Input label="Category Name" value={newName} onChangeText={setNewName} placeholder="e.g. Bridal Special" />
        <Input label="Description (optional)" value={newDesc} onChangeText={setNewDesc} placeholder="Short description" multiline />
      </PremiumModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  catCard: {
    backgroundColor: MD3Colors.surface,
    borderRadius: MD3Radius.lg,
    marginBottom: MD3Spacing.sm,
    ...MD3Elevation.level2,
    overflow: 'hidden',
  },
  catTop: { flexDirection: 'row', alignItems: 'center', padding: MD3Spacing.md },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: MD3Colors.tertiaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MD3Spacing.md,
  },
  catInfo: { flex: 1 },
  catName: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  catDesc: { fontFamily: 'Roboto-Regular', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  catDivider: { height: 1, backgroundColor: MD3Colors.outlineVariant },
  catBottom: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: MD3Spacing.md, paddingVertical: MD3Spacing.sm, gap: MD3Spacing.md },
  catStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catStatText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.onSurfaceVariant },
  catDelete: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingVertical: 4, paddingHorizontal: MD3Spacing.sm, borderRadius: MD3Radius.full, backgroundColor: MD3Colors.errorContainer },
  catDeleteText: { fontFamily: 'Roboto-Medium', fontSize: 12, color: MD3Colors.error },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: MD3Colors.tertiaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: MD3Spacing.lg,
  },
});
