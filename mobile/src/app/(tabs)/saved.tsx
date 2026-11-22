import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PaletteCard, { CARD_GAP } from '~/components/PaletteCard';
import { Button } from '~/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { SEED_BY_ID } from '@/lib/data/palettes';
import { openPalette } from '~/lib/openPalette';
import { colors } from '~/theme';
import type { Palette } from '@/lib/color/types';

export default function SavedScreen() {
  const favorites = useAppStore((s) => s.favorites);
  const saved = useAppStore((s) => s.saved);
  const remote = useRemoteStore((s) => s.palettes);

  // Newest bookmark first. Older installs may hold an id without a stored copy,
  // so fall back to the bundled or published palette with that id.
  const list = useMemo(() => {
    const remoteById = new Map(remote.map((p) => [p.id, p]));
    return favorites
      .slice()
      .reverse()
      .map((id) => saved[id] ?? remoteById.get(id) ?? SEED_BY_ID.get(id))
      .filter((p): p is Palette => Boolean(p));
  }, [favorites, saved, remote]);

  if (!list.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={40} color={colors.ink300} />
        <Text style={styles.title}>No saved palettes yet</Text>
        <Text style={styles.text}>Tap the bookmark on any palette. Saved palettes stay on this phone, even offline.</Text>
        <Button label="Browse palettes" variant="solid" onPress={() => router.navigate('/')} />
      </View>
    );
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PaletteCard palette={item} onOpen={openPalette} />}
      ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
      ListHeaderComponent={<Text style={styles.count}>{list.length} saved on this device</Text>}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink900 },
  text: { fontSize: 14, color: colors.ink500, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  count: { fontSize: 12, color: colors.ink500, marginBottom: 12 },
});
