import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CohesionFields from '~/components/CohesionFields';
import HexInput from '~/components/HexInput';
import { Button, Chip, SectionTitle } from '~/components/ui';
import { generatePalette, resolveCohesion } from '@/lib/color/palette';
import { HARMONIES } from '@/lib/color/harmony';
import { readableInk } from '@/lib/color/core';
import { randomSeed } from '@/lib/color/random';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { toast } from '@/store/useToastStore';
import { copy, copyHex, sharePalette } from '~/lib/actions';
import { openPalette } from '~/lib/openPalette';
import { colors, font } from '~/theme';
import type { CohesionSettings, HarmonyKind } from '@/lib/color/types';

const MIN = 3;
const MAX = 10;

const num = (v: string | string[] | undefined) => (typeof v === 'string' ? Number(v) : NaN);

export default function GenerateScreen() {
  const params = useLocalSearchParams<{ seed?: string; size?: string; harmony?: string; tint?: string; alpha?: string }>();
  const { height } = useWindowDimensions();

  const [seed, setSeed] = useState(() => randomSeed());
  const [size, setSize] = useState(5);
  const [harmony, setHarmony] = useState<HarmonyKind | 'auto'>('auto');
  const [settings, setSettings] = useState<CohesionSettings>(() => resolveCohesion());
  const [locks, setLocks] = useState<(string | null)[]>(() => Array(5).fill(null));
  const [editing, setEditing] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);

  const saved = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const remoteStatus = useRemoteStore((s) => s.status);
  const publish = useRemoteStore((s) => s.publish);

  // "Remix" from a palette screen lands here with that palette's recipe.
  useEffect(() => {
    const s = num(params.seed);
    if (!Number.isFinite(s) || s <= 0) return;
    const n = num(params.size);
    const nextSize = n >= MIN && n <= MAX ? n : 5;
    setSeed(s);
    setSize(nextSize);
    setLocks(Array(nextSize).fill(null));
    if (params.harmony && (HARMONIES as string[]).includes(params.harmony)) setHarmony(params.harmony as HarmonyKind);
    const alpha = num(params.alpha);
    setSettings((prev) => ({
      ...prev,
      ...(params.tint && /^#[0-9a-f]{6}$/i.test(params.tint) ? { tint: params.tint } : {}),
      ...(Number.isFinite(alpha) ? { alpha } : {}),
    }));
  }, [params.seed, params.size, params.harmony, params.tint, params.alpha]);

  const palette = useMemo(
    () =>
      generatePalette({
        seed,
        size,
        harmony: harmony === 'auto' ? undefined : harmony,
        cohesion: settings,
        locks,
      }),
    [seed, size, harmony, settings, locks],
  );

  const regenerate = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSeed(randomSeed());
  }, []);

  const resize = (next: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, next));
    if (clamped === size) return;
    void Haptics.selectionAsync();
    setSize(clamped);
    setLocks((prev) => {
      const out = prev.slice(0, clamped);
      while (out.length < clamped) out.push(null);
      return out;
    });
  };

  const toggleLock = (i: number) => {
    void Haptics.selectionAsync();
    setLocks((prev) => prev.map((v, j) => (j === i ? (v ? null : palette.colors[i]!) : v)));
  };

  const lockedCount = locks.filter(Boolean).length;
  const isSaved = saved.includes(palette.id);
  const stripHeight = Math.max(320, Math.round(height * 0.5));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.stripes, { height: stripHeight }]}>
          {palette.colors.map((hex, i) => {
            const ink = readableInk(hex);
            const locked = Boolean(locks[i]);
            return (
              <Pressable accessibilityRole="button"
                key={i}
                onPress={() => void copyHex(hex)}
                onLongPress={() => toggleLock(i)}
                style={[styles.stripe, { backgroundColor: hex }]}
                accessibilityLabel={`${hex}, tap to copy, hold to ${locked ? 'unlock' : 'lock'}`}
              >
                <Text style={[styles.hex, { color: ink }]}>{hex.slice(1).toUpperCase()}</Text>
                <View style={styles.stripeActions}>
                  <Pressable hitSlop={8} accessibilityRole="button" onPress={() => setEditing(i)} accessibilityLabel={`Pin an exact colour for swatch ${i + 1}`}>
                    <Ionicons name="create-outline" size={18} color={ink} style={{ opacity: 0.75 }} />
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() => toggleLock(i)}
                    accessibilityRole="button"
                    accessibilityLabel={locked ? `Unlock swatch ${i + 1}` : `Lock swatch ${i + 1}`}
                    style={[styles.lock, locked && { backgroundColor: ink === '#ffffff' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)' }]}
                  >
                    <Ionicons name={locked ? 'lock-closed' : 'lock-open-outline'} size={17} color={ink} />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.hint}>
          {lockedCount
            ? `${lockedCount} pinned — Generate rebuilds the rest around them`
            : 'Tap a colour to copy it, hold to pin it'}
        </Text>

        <View style={styles.controls}>
          <View style={styles.stepper}>
            <Pressable onPress={() => resize(size - 1)} disabled={size <= MIN} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="Remove a colour">
              <Ionicons name="remove" size={20} color={size <= MIN ? colors.ink300 : colors.ink900} />
            </Pressable>
            <Text style={styles.stepText}>{size} colors</Text>
            <Pressable onPress={() => resize(size + 1)} disabled={size >= MAX} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="Add a colour">
              <Ionicons name="add" size={20} color={size >= MAX ? colors.ink300 : colors.ink900} />
            </Pressable>
          </View>
          <Button label="Generate" icon="shuffle" variant="solid" onPress={regenerate} style={{ flex: 1, height: 44 }} />
        </View>

        <SectionTitle>Harmony</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
          <Chip label="Auto" active={harmony === 'auto'} onPress={() => setHarmony('auto')} />
          {HARMONIES.map((h) => (
            <Chip key={h} label={h} active={harmony === h} onPress={() => setHarmony(h)} />
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label={isSaved ? 'Saved' : 'Save'}
            icon={isSaved ? 'bookmark' : 'bookmark-outline'}
            onPress={() => {
              toggleFavorite(palette.id, palette);
              if (!isSaved) toast('Saved on this device');
            }}
          />
          <Button label="Copy all" icon="copy-outline" onPress={() => void copy(palette.colors.join(', ').toUpperCase(), { label: 'Copied all swatches' })} />
          <Button label="Share" icon="share-social-outline" onPress={() => void sharePalette(palette)} />
          {remoteStatus !== 'off' ? (
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
          <Button label="Export & contrast" icon="expand-outline" onPress={() => openPalette(palette)} />
        </View>

        <SectionTitle>Cohesion overlay</SectionTitle>
        <Text style={styles.copy}>
          One key colour laid over every swatch. Pull it warm or cool and the whole set changes mood without
          losing its contrast ladder.
        </Text>
        <View style={{ marginTop: 12 }}>
          <CohesionFields value={settings} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} />
        </View>

        <View style={styles.meta}>
          <Meta label="Name" value={palette.name} />
          <Meta label="Harmony" value={palette.harmony} />
          <Meta label="Mood" value={palette.moods.join(', ')} />
          <Meta label="Seed" value={String(palette.seed)} mono />
        </View>
      </ScrollView>

      <HexInput
        visible={editing !== null}
        initial={editing !== null ? palette.colors[editing] ?? '#000000' : '#000000'}
        onClose={() => setEditing(null)}
        onSubmit={(hex) => {
          const i = editing;
          setEditing(null);
          if (i === null) return;
          setLocks((prev) => prev.map((v, j) => (j === i ? hex : v)));
        }}
      />
    </View>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, mono && { fontFamily: font.mono }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  stripes: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  stripe: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  hex: { fontFamily: font.mono, fontSize: 15, letterSpacing: 1, fontWeight: '600' },
  stripeActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  lock: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, color: colors.ink500, marginTop: 8, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
  stepper: {
    flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 999,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { width: 74, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.ink900, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  copy: { fontSize: 13, lineHeight: 19, color: colors.ink500 },
  meta: { marginTop: 24, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaLabel: { fontSize: 12, color: colors.ink500 },
  metaValue: { fontSize: 12, color: colors.ink900, flexShrink: 1, textAlign: 'right' },
});
