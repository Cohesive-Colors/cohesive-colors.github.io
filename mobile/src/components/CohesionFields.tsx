import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { TINT_SWATCHES } from '@/lib/color/palette';
import { readableInk } from '@/lib/color/core';
import { colors } from '~/theme';
import type { CohesionSettings } from '@/lib/color/types';

/**
 * Key colour grid + sliders for the cohesion pass. Used by the generator (live)
 * and by the feed overlay sheet.
 *
 * `onCommit` fires when a slider is released. The feed uses it so that 480
 * palettes are re-blended once per gesture rather than on every frame.
 */
export default function CohesionFields({
  value,
  onChange,
  onCommit,
}: {
  value: CohesionSettings;
  onChange: (patch: Partial<CohesionSettings>) => void;
  onCommit?: (patch: Partial<CohesionSettings>) => void;
}) {
  const commit = onCommit ?? onChange;
  return (
    <View>
      <View style={styles.grid}>
        {TINT_SWATCHES.map((t) => {
          const active = value.tint.toLowerCase() === t.hex.toLowerCase();
          return (
            <Pressable accessibilityRole="button"
              key={t.hex}
              onPress={() => commit({ tint: t.hex })}
              accessibilityLabel={`Key colour ${t.name}`}
              accessibilityState={{ selected: active }}
              style={[styles.tint, { backgroundColor: t.hex }, active && styles.tintActive]}
            >
              {active ? <Ionicons name="checkmark" size={16} color={readableInk(t.hex)} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Field label="Overlay strength" value={value.alpha} min={0} max={0.5} step={0.01}
        format={(v) => `${Math.round(v * 100)}%`} onChange={(alpha) => onChange({ alpha })} onCommit={(alpha) => commit({ alpha })} />
      <Field label="Keep lightness" value={value.preserveLightness} min={0} max={1} step={0.02}
        format={(v) => `${Math.round(v * 100)}%`} onChange={(preserveLightness) => onChange({ preserveLightness })} onCommit={(preserveLightness) => commit({ preserveLightness })} />
      <Field label="Hue pull" value={value.hueBias} min={0} max={1} step={0.02}
        format={(v) => `${Math.round(v * 100)}%`} onChange={(hueBias) => onChange({ hueBias })} onCommit={(hueBias) => commit({ hueBias })} />
    </View>
  );
}

export function Field({
  label, value, min, max, step, format, onChange, onCommit,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void; onCommit?: (v: number) => void;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{format(value)}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        onSlidingComplete={onCommit ?? onChange}
        minimumTrackTintColor={colors.ink900}
        maximumTrackTintColor={colors.line}
        thumbTintColor={colors.ink900}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tint: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  tintActive: { borderWidth: 2, borderColor: colors.ink900 },
  field: { marginTop: 14 },
  fieldHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldValue: { fontSize: 12, color: colors.ink900, fontVariant: ['tabular-nums'] },
});
