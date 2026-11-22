import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ContrastMatrix from '~/components/ContrastMatrix';
import ExportPanel from '~/components/ExportPanel';
import { Button, Chip, SectionTitle } from '~/components/ui';
import { readableInk, toOklchString, toRgbString } from '@/lib/color/core';
import { hueFamily } from '@/lib/color/naming';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { toast } from '@/store/useToastStore';
import { usePaletteRegistry, lookupPalette } from '~/store/usePaletteRegistry';
import { useLikes } from '~/lib/useLikes';
import { copy, sharePalette } from '~/lib/actions';
import { age } from '~/lib/time';
import { colors, font } from '~/theme';

type Format = 'hex' | 'rgb' | 'oklch';
const FORMAT = (f: Format, hex: string) =>
  f === 'hex' ? hex.toUpperCase() : f === 'rgb' ? toRgbString(hex) : toOklchString(hex);

export default function PaletteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const registry = usePaletteRegistry((s) => s.byId);
  const savedMap = useAppStore((s) => s.saved);
  const remote = useRemoteStore((s) => s.palettes);
  const publish = useRemoteStore((s) => s.publish);
  const remoteStatus = useRemoteStore((s) => s.status);
  const isSaved = useAppStore((s) => s.favorites.includes(id ?? ''));
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const likes = useLikes();
  const [format, setFormat] = useState<Format>('hex');
  const [publishing, setPublishing] = useState(false);

  const palette = useMemo(() => {
    if (!id) return null;
    const base = registry[id] ?? lookupPalette(id, savedMap);
    // A published copy carries the live like count; keep the colours as shown.
    const live = remote.find((p) => p.id === id);
    return base ? (live ? { ...base, likes: live.likes } : base) : live ?? null;
  }, [id, registry, savedMap, remote]);

  if (!palette) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Palette' }} />
        <Text style={styles.missingText}>This palette is no longer available.</Text>
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const liked = likes.isLiked(palette.id);
  const published = remote.some((p) => p.id === palette.id) || Boolean(palette.slug);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: palette.name }} />

      <View style={styles.swatches}>
        {palette.colors.map((hex, i) => {
          const value = FORMAT(format, hex);
          return (
            <Pressable accessibilityRole="button"
              key={`${hex}-${i}`}
              onPress={() => void copy(value, { swatch: hex })}
              style={[styles.swatch, { backgroundColor: hex }]}
              accessibilityLabel={`Copy ${value}`}
            >
              <Text style={[styles.swatchText, { color: readableInk(hex) }]} numberOfLines={1}>
                {value}
              </Text>
              <Ionicons name="copy-outline" size={15} color={readableInk(hex)} style={{ opacity: 0.6 }} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.formats}>
        {(['hex', 'rgb', 'oklch'] as const).map((f) => (
          <Chip key={f} label={f.toUpperCase()} active={format === f} onPress={() => setFormat(f)} />
        ))}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {palette.colors.length} colors · {palette.harmony} · {hueFamily(palette.hue).name} · {age(palette.createdAt)}
        </Text>
      </View>
      <View style={styles.moods}>
        {palette.moods.map((m) => (
          <Text key={m} style={styles.mood}>{m}</Text>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={String(likes.count(palette))}
          icon={liked ? 'heart' : 'heart-outline'}
          onPress={() => void likes.toggle(palette)}
        />
        <Button
          label={isSaved ? 'Saved' : 'Save'}
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          onPress={() => toggleFavorite(palette.id, palette)}
        />
        <Button label="Share" icon="share-social-outline" onPress={() => void sharePalette(palette)} />
        <Button
          label="Remix"
          icon="color-wand-outline"
          onPress={() =>
            router.navigate({
              pathname: '/generate',
              params: {
                seed: String(palette.seed || ''),
                size: String(palette.colors.length),
                harmony: palette.harmony,
                tint: palette.cohesion?.tint ?? '',
                alpha: String(palette.cohesion?.alpha ?? ''),
              },
            })
          }
        />
        {!published && remoteStatus !== 'off' ? (
          <Button
            label={publishing ? 'Publishing…' : 'Publish'}
            icon="cloud-upload-outline"
            disabled={publishing}
            onPress={async () => {
              setPublishing(true);
              const result = await publish(palette);
              setPublishing(false);
              toast(result === 'published' ? 'Published to the shared feed' : 'Could not publish, check your connection', {
                tone: result === 'published' ? 'default' : 'error',
              });
            }}
          />
        ) : null}
      </View>

      <SectionTitle>Export</SectionTitle>
      <ExportPanel palette={palette} />

      <SectionTitle>Contrast</SectionTitle>
      <ContrastMatrix colors={palette.colors} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  swatches: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  swatch: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  swatchText: { fontFamily: font.mono, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  formats: { flexDirection: 'row', gap: 6, marginTop: 12 },
  metaRow: { marginTop: 14 },
  meta: { fontSize: 13, color: colors.ink500 },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  mood: {
    fontSize: 12, color: colors.ink700, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  missingText: { fontSize: 15, color: colors.ink700 },
});
