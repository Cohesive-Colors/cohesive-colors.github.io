import { useCallback, useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PaletteCard, { CARD_GAP } from '~/components/PaletteCard';
import { Button, Chip } from '~/components/ui';
import { buildFeed, generateMatching, matchesFilters, mergeSources } from '@/lib/feed';
import { recohere } from '@/lib/color/palette';
import { ALL_MOODS, HUE_FAMILY_NAMES } from '@/lib/color/naming';
import { SEED_PALETTES } from '@/lib/data/palettes';
import { FEED_TABS, useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { openPalette } from '~/lib/openPalette';
import { colors } from '~/theme';
import type { Palette } from '@/lib/color/types';

const SIZES = [3, 4, 5, 6, 7, 8, 9, 10];
const HUE_DOT: Record<string, string> = {
  Red: '#d8423b', Orange: '#e58a2c', Yellow: '#e2c041', Green: '#4f9a52',
  Teal: '#2a9d94', Blue: '#3b6fd1', Purple: '#7d55c7', Pink: '#d45a9b',
};

export default function FeedScreen() {
  const tab = useAppStore((s) => s.tab);
  const query = useAppStore((s) => s.query);
  const moods = useAppStore((s) => s.moods);
  const hueFamily = useAppStore((s) => s.hueFamily);
  const size = useAppStore((s) => s.size);
  const shuffleKey = useAppStore((s) => s.shuffleKey);
  const overlay = useAppStore((s) => s.overlay);
  const { setTab, setQuery, toggleMood, setHueFamily, setSize, clearFilters, reshuffle } = useAppStore.getState();

  const remote = useRemoteStore((s) => s.palettes);
  const [extra, setExtra] = useState<Palette[]>([]);

  // Typing re-filters 480 palettes; deferring keeps the keyboard responsive.
  const deferredQuery = useDeferredValue(query);

  const source = useMemo(() => mergeSources(remote, SEED_PALETTES), [remote]);

  const cohered = useMemo(() => {
    if (!overlay.enabled) return source;
    const { enabled: _enabled, ...settings } = overlay;
    return source.map((p) => recohere(p, settings));
  }, [source, overlay]);

  const filters = useMemo(
    () => ({ query: deferredQuery, moods, hueFamily, size, onlyIds: null }),
    [deferredQuery, moods, hueFamily, size],
  );

  const feed = useMemo(() => buildFeed(cohered, filters, tab, shuffleKey), [cohered, filters, tab, shuffleKey]);

  const generated = useMemo(() => extra.filter((p) => matchesFilters(p, filters)), [extra, filters]);
  const data = useMemo(() => [...feed, ...generated], [feed, generated]);

  const generateMore = useCallback(() => {
    const { enabled, ...settings } = overlay;
    const batch = generateMatching({ query: '', moods, hueFamily, size }, 12, {
      cohesion: enabled ? settings : undefined,
    });
    setExtra((prev) => [...prev, ...batch]);
  }, [moods, hueFamily, size, overlay]);

  const filtersActive = query !== '' || moods.length > 0 || hueFamily !== null || size !== null;

  const header = (
    <View style={styles.header}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.ink300} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search names, moods or #hex"
            placeholderTextColor={colors.ink300}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable accessibilityRole="button"
          onPress={() => router.push('/cohesion')}
          style={[styles.cohesion, overlay.enabled && styles.cohesionOn]}
          accessibilityLabel="Cohesion overlay"
        >
          <View style={[styles.tintDot, { backgroundColor: overlay.tint }]} />
          <Ionicons name="options-outline" size={16} color={overlay.enabled ? '#fff' : colors.ink700} />
        </Pressable>
      </View>

      <Row>
        {FEED_TABS.map((t) => (
          <Chip
            key={t.id}
            label={t.label}
            active={tab === t.id}
            onPress={() => {
              setTab(t.id);
              if (t.id === 'random') reshuffle();
            }}
          />
        ))}
      </Row>

      <Text style={styles.rowLabel}>Number of colors</Text>
      <Row>
        <Chip label="Any" active={size === null} onPress={() => setSize(null)} />
        {SIZES.map((n) => (
          <Chip key={n} label={String(n)} active={size === n} onPress={() => setSize(size === n ? null : n)}
            accessibilityLabel={`${n} colors`} />
        ))}
      </Row>

      <Text style={styles.rowLabel}>Hue</Text>
      <Row>
        <Chip label="Any" active={hueFamily === null} onPress={() => setHueFamily(null)} />
        {HUE_FAMILY_NAMES.map((h) => (
          <Chip key={h} label={h} dot={HUE_DOT[h]} active={hueFamily === h}
            onPress={() => setHueFamily(hueFamily === h ? null : h)} />
        ))}
      </Row>

      <Text style={styles.rowLabel}>Mood</Text>
      <Row>
        {ALL_MOODS.map((m) => (
          <Chip key={m} label={m} active={moods.includes(m)} onPress={() => toggleMood(m)} />
        ))}
      </Row>

      <View style={styles.countRow}>
        <Text style={styles.count}>
          {feed.length} palette{feed.length === 1 ? '' : 's'}
          {overlay.enabled ? ' · overlay on' : ''}
        </Text>
        {filtersActive ? (
          <Pressable accessibilityRole="button" onPress={clearFilters} hitSlop={8} style={styles.clear}>
            <Ionicons name="close" size={14} color={colors.ink700} />
            <Text style={styles.clearText}>Clear filters</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PaletteCard palette={item} onOpen={openPalette} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="color-palette-outline" size={36} color={colors.ink300} />
          <Text style={styles.emptyTitle}>Nothing matches these filters</Text>
          <Text style={styles.emptyText}>Generate fresh palettes that do, or loosen a filter.</Text>
        </View>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          <Button label="Generate 12 more that match" icon="sparkles-outline" variant="solid" onPress={generateMore} />
          {generated.length ? (
            <Text style={styles.footerNote}>{generated.length} generated on this device, open one to publish it</Text>
          ) : null}
        </View>
      }
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={8}
      windowSize={7}
      removeClippedSubviews
    />
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.rowScroll}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const Separator = () => <View style={{ height: CARD_GAP }} />;

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 14 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  search: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink900, paddingVertical: 0 },
  cohesion: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  cohesionOn: { backgroundColor: colors.ink900, borderColor: colors.ink900 },
  tintDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  rowScroll: { marginHorizontal: -16 },
  row: { gap: 6, paddingHorizontal: 16, paddingVertical: 2 },
  rowLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink500, marginTop: 12, marginBottom: 6 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  count: { fontSize: 12, color: colors.ink500 },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText: { fontSize: 12, color: colors.ink700, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.ink900 },
  emptyText: { fontSize: 13, color: colors.ink500, textAlign: 'center' },
  footer: { marginTop: 20, alignItems: 'center', gap: 8 },
  footerNote: { fontSize: 12, color: colors.ink500 },
});
