import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  mindMapRoot: { gap: 10 },
  mindMapNode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  mindMapBullet: {
    fontSize: 13,
    color: '#c9920a',
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 1,
  },
  mindMapLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  mindMapChildren: { gap: 6, marginTop: 6 },
  mindMapChildNode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 16,
  },
  mindMapChildBullet: {
    fontSize: 11,
    color: '#c9920a',
    lineHeight: 20,
    marginTop: 1,
  },
  mindMapChildLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 20,
    color: '#504534',
    fontWeight: '600',
  },
  mindMapGrandchildren: { gap: 4, marginTop: 4 },
  mindMapGrandchildNode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 32,
  },
  mindMapGrandchildBullet: {
    fontSize: 10,
    color: '#827562',
    lineHeight: 18,
    marginTop: 1,
  },
  mindMapGrandchildLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: '#827562',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    color: '#827562',
    fontStyle: 'italic',
  },
});

export default styles;
