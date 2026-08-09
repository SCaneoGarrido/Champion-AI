import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F4F2',
  },
  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#8B6A00',
  },
  badge: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(147,51,234,0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9333ea',
    letterSpacing: 0.5,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
  },
});

export default styles;
