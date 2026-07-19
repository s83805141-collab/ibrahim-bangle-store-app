import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Trash2, Tag, ChevronRight } from 'lucide-react-native';
import { MD3Colors, MD3Spacing, MD3Radius, MD3Elevation } from '@/lib/theme';
import { getAllCategories, getAllProducts, addCategory, deleteCategory, Category, ProductWithDetails } from '@/lib/db/repo';
import { Button, Input, EmptyState, ScreenHeader } from '@/components/ui';

export default function CategoriesScreen() {
  const router = useRouter();
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
        renderItem={({ item }) => (
          <View style={styles.catCard}>
            <View style={styles.catIconWrap}><Tag size={20} color={MD3Colors.tertiary} /></View>
            <View style={styles.catInfo}>
              <Text style={styles.catName}>{item.name}</Text>
              <Text style={styles.catMeta}>{productCount(item.id)} products · {stockCount(item.id)} in stock</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.catDelete}>
              <Trash2 size={18} color={MD3Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={28} color={MD3Colors.onPrimary} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Category</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Input label="Category Name" value={newName} onChangeText={setNewName} placeholder="e.g. Bridal Special" />
              <Input label="Description (optional)" value={newDesc} onChangeText={setNewDesc} multiline />
              <Button title="Add Category" onPress={handleAdd} loading={saving} style={{ marginTop: MD3Spacing.sm }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3Colors.background },
  catCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MD3Colors.surface, borderRadius: MD3Radius.md, padding: MD3Spacing.md, marginBottom: MD3Spacing.sm, ...MD3Elevation.level1 },
  catIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: MD3Colors.tertiaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: MD3Spacing.md },
  catInfo: { flex: 1 },
  catName: { fontFamily: 'Roboto-Bold', fontSize: 16, color: MD3Colors.onSurface, marginBottom: 2 },
  catMeta: { fontFamily: 'Roboto-Regular', fontSize: 13, color: MD3Colors.onSurfaceVariant },
  catDelete: { padding: MD3Spacing.sm },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: MD3Colors.primary, justifyContent: 'center', alignItems: 'center', ...MD3Elevation.level3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: MD3Colors.surface, borderTopLeftRadius: MD3Radius.xl, borderTopRightRadius: MD3Radius.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: MD3Spacing.lg, borderBottomWidth: 1, borderBottomColor: MD3Colors.outlineVariant },
  modalTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, color: MD3Colors.onSurface },
  cancelText: { fontFamily: 'Roboto-Medium', fontSize: 14, color: MD3Colors.primary },
  modalBody: { padding: MD3Spacing.lg },
});
