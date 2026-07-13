import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

function fmtRelative(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

function NotificationRow({ item, onPress }) {
  const isFailed = item.status === 'failed';
  const name = item.name ?? 'Knowledge Pack';
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconWrap, isFailed && styles.iconWrapFailed]}>
        <MaterialIcons
          name={isFailed ? 'error-outline' : 'check-circle'}
          size={18}
          color={isFailed ? '#ef4444' : '#16a34a'}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {isFailed ? `"${name}" falló al procesarse` : `"${name}" ya está disponible`}
        </Text>
        <Text style={styles.rowTime}>{fmtRelative(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsPanel({ visible, items, onClose, onSelectItem }) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Notificaciones recientes</Text>
          <TouchableOpacity onPress={onClose} hitSlop={14} style={styles.closeBtn}>
            <MaterialIcons name="close" size={18} color="#827562" />
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="notifications-none" size={32} color="#c9b8a3" />
            <Text style={styles.emptyText}>Sin notificaciones recientes</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <NotificationRow item={item} onPress={() => onSelectItem?.(item)} />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(212,196,174,0.5)',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212,196,174,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: { fontSize: 13, color: '#a8998a', fontWeight: '600' },
  list: { flexGrow: 0 },
  separator: {
    height: 1,
    backgroundColor: 'rgba(212,196,174,0.18)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapFailed: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  rowTime: { fontSize: 11, color: '#a8998a', marginTop: 2, fontWeight: '600' },
});
