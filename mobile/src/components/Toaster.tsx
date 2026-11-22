import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/store/useToastStore';
import { colors } from '~/theme';

/** Renders the site's shared toast store; sits above the tab bar. */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 72 }]}>
      {toasts.map((t) => (
        <View key={t.id} style={[styles.toast, t.tone === 'error' && { backgroundColor: colors.accent }]}>
          {t.swatch ? <View style={[styles.swatch, { backgroundColor: t.swatch }]} /> : null}
          <Text style={styles.text} numberOfLines={2}>
            {t.message}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 8 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.ink900,
    maxWidth: 420,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  swatch: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  text: { color: '#fff', fontSize: 13, fontWeight: '500', flexShrink: 1 },
});
