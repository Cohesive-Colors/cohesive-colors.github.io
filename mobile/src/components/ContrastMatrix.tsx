import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { readableInk, wcag, type WcagVerdict } from '@/lib/color/core';
import { colors as t, font } from '~/theme';

const BADGE: Record<WcagVerdict['label'], { bg: string; fg: string }> = {
  AAA: { bg: '#d1fae5', fg: '#065f46' },
  AA: { bg: '#ecfdf5', fg: '#047857' },
  'AA Large': { bg: '#fffbeb', fg: '#b45309' },
  Fail: { bg: '#fef2f2', fg: '#dc2626' },
};

const CELL = 40;

/** Every swatch against every other, WCAG 2.1 ratio — the same table as the site. */
export default function ContrastMatrix({ colors }: { colors: string[] }) {
  const rows = useMemo(() => colors.map((bg) => colors.map((fg) => wcag(bg, fg))), [colors]);

  const best = useMemo(() => {
    let top = { ratio: 0, bg: colors[0]!, fg: colors[0]! };
    colors.forEach((bg, i) =>
      colors.forEach((fg, j) => {
        if (i !== j && rows[i]![j]!.ratio > top.ratio) top = { ratio: rows[i]![j]!.ratio, bg, fg };
      }),
    );
    return top;
  }, [colors, rows]);

  return (
    <View style={{ gap: 14 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ gap: 3 }}>
          <View style={styles.row}>
            <View style={{ width: CELL }} />
            {colors.map((c, i) => (
              <View key={`h-${i}`} style={[styles.head, { backgroundColor: c }]} />
            ))}
          </View>
          {colors.map((bg, i) => (
            <View key={`r-${i}`} style={styles.row}>
              <View style={[styles.cell, { backgroundColor: bg }]} />
              {colors.map((fg, j) => (
                <View key={`c-${j}`} style={[styles.cell, { backgroundColor: i === j ? bg : fg }]}>
                  <Text style={[styles.ratio, { color: i === j ? readableInk(bg) : bg }]}>
                    {i === j ? '·' : rows[i]![j]!.ratio.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.box}>
        <Text style={styles.label}>Text on each swatch</Text>
        {colors.map((c, i) => {
          const onWhite = wcag(c, '#ffffff');
          const onBlack = wcag(c, '#000000');
          const winner = onWhite.ratio >= onBlack.ratio ? onWhite : onBlack;
          const badge = BADGE[winner.label];
          return (
            <View key={`t-${i}`} style={styles.line}>
              <View style={[styles.aa, { backgroundColor: c }]}>
                <Text style={{ color: readableInk(c), fontSize: 11, fontWeight: '700' }}>Aa</Text>
              </View>
              <Text style={styles.hex}>{c.toUpperCase()}</Text>
              <Text style={[styles.badge, { backgroundColor: badge.bg, color: badge.fg }]}>
                {winner.label} · {winner.ratio.toFixed(2)}:1
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>Best pairing</Text>
        <View style={[styles.best, { backgroundColor: best.bg }]}>
          <Text style={{ color: best.fg, fontSize: 17, fontWeight: '600' }}>The quick brown fox</Text>
          <Text style={{ color: best.fg, opacity: 0.8, fontSize: 12, marginTop: 2 }}>
            {best.ratio.toFixed(2)}:1, passes {wcag(best.bg, best.fg).label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  head: { width: CELL, height: 14, borderRadius: 4 },
  cell: { width: CELL, height: 30, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  ratio: { fontSize: 11, fontFamily: font.mono },
  box: { borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 12, gap: 8, backgroundColor: t.surface },
  label: { fontSize: 11, fontWeight: '600', color: t.ink500, textTransform: 'uppercase', letterSpacing: 0.6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aa: { width: 52, height: 26, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  hex: { fontFamily: font.mono, fontSize: 12, color: t.ink700, flex: 1 },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  best: { height: 96, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
