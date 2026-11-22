import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { SectionTitle, type IconName } from '~/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { SITE_URL } from '~/lib/links';
import { colors } from '~/theme';

const STATUS: Record<string, string> = {
  off: 'Offline mode — likes stay on this phone',
  connecting: 'Connecting to the shared feed…',
  ready: 'Connected — likes and publishing are shared',
  error: 'Shared feed unreachable, showing bundled palettes',
};

export default function AboutScreen() {
  const status = useRemoteStore((s) => s.status);
  const savedCount = useAppStore((s) => s.favorites.length);
  const clearSaved = useAppStore((s) => s.clearSaved);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Cohesive Colors</Text>
        <Text style={styles.text}>
          Palettes from 3 to 10 colours, each held together by one key colour. Browse the curated feed, generate your
          own, check contrast and export to CSS, Tailwind, Swift or Android.
        </Text>
      </View>

      <SectionTitle>Status</SectionTitle>
      <View style={styles.card}>
        <View style={[styles.dot, { backgroundColor: status === 'ready' ? '#22a06b' : status === 'error' ? colors.accent : colors.ink300 }]} />
        <Text style={styles.cardText}>{STATUS[status]}</Text>
      </View>

      <SectionTitle>Links</SectionTitle>
      <Row icon="globe-outline" label="Open the website" onPress={() => void Linking.openURL(SITE_URL)} />
      <Row icon="shield-checkmark-outline" label="Privacy policy" onPress={() => void Linking.openURL(`${SITE_URL}/privacy/`)} />

      <SectionTitle>Your data</SectionTitle>
      <Row
        icon="trash-outline"
        label={`Clear saved palettes (${savedCount})`}
        disabled={!savedCount}
        external={false}
        onPress={() =>
          Alert.alert('Clear saved palettes?', 'This removes every bookmark on this phone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: clearSaved },
          ])
        }
      />

      <Text style={styles.version}>Version {version}</Text>
    </ScrollView>
  );
}

function Row({ icon, label, onPress, disabled, external = true }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; external?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 }]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={colors.ink700} />
      <Text style={styles.rowText}>{label}</Text>
      {external ? <Ionicons name="open-outline" size={16} color={colors.ink300} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  hero: { alignItems: 'center', paddingTop: 12 },
  logo: { width: 88, height: 88, borderRadius: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink900, marginTop: 14 },
  text: { fontSize: 14, lineHeight: 21, color: colors.ink500, textAlign: 'center', marginTop: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardText: { fontSize: 14, color: colors.ink700, flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  rowText: { flex: 1, fontSize: 14, color: colors.ink900, fontWeight: '500' },
  version: { textAlign: 'center', fontSize: 12, color: colors.ink300, marginTop: 28 },
});
