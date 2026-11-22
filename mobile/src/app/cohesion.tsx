import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import CohesionFields from '~/components/CohesionFields';
import { Button, Chip, SectionTitle } from '~/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { useState, useEffect } from 'react';
import { colors } from '~/theme';
import type { BlendMode, CohesionSettings } from '@/lib/color/types';

const BLENDS: { id: BlendMode; label: string }[] = [
  { id: 'overlay', label: 'Overlay' },
  { id: 'soft-light', label: 'Soft light' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
  { id: 'mix', label: 'Mix' },
];

/** Re-blends every palette in the feed with one key colour — the site's CohesionControl. */
export default function CohesionScreen() {
  const overlay = useAppStore((s) => s.overlay);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const resetOverlay = useAppStore((s) => s.resetOverlay);

  // Sliders move a local draft; the feed only re-blends when a finger lifts.
  const [draft, setDraft] = useState<CohesionSettings>(overlay);
  useEffect(() => setDraft(overlay), [overlay]);

  const commit = (patch: Partial<CohesionSettings>) => setOverlay({ ...patch, enabled: true });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Apply across the feed</Text>
          <Text style={styles.text}>
            Every palette is re-blended with this key colour in OKLab, then its original lightness is restored so
            contrast survives.
          </Text>
        </View>
        <Switch
          value={overlay.enabled}
          onValueChange={(enabled) => setOverlay({ enabled })}
          trackColor={{ true: colors.ink900, false: colors.line }}
          thumbColor="#fff"
        />
      </View>

      <SectionTitle>Key colour</SectionTitle>
      <CohesionFields
        value={draft}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onCommit={commit}
      />

      <SectionTitle>Blend mode</SectionTitle>
      <View style={styles.blends}>
        {BLENDS.map((b) => (
          <Chip key={b.id} label={b.label} active={overlay.blend === b.id} onPress={() => commit({ blend: b.id })} />
        ))}
      </View>

      <Button label="Reset to each palette's own key" icon="refresh" onPress={resetOverlay} style={{ marginTop: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  toggle: {
    flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink900 },
  text: { fontSize: 12.5, lineHeight: 18, color: colors.ink500, marginTop: 4 },
  blends: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
