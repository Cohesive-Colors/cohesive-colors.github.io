import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip, Button } from './ui';
import { EXPORT_FORMATS, exportAs, extensionFor, slug, type ExportFormat } from '@/lib/color/export';
import { copy, shareText } from '~/lib/actions';
import { colors, font } from '~/theme';
import type { Palette } from '@/lib/color/types';

/** Code export in every format the site offers, copied or sent through the share sheet. */
export default function ExportPanel({ palette }: { palette: Palette }) {
  const [format, setFormat] = useState<ExportFormat>('css');
  const code = useMemo(() => exportAs(format, palette), [format, palette]);
  const filename = `${slug(palette.name)}.${extensionFor(format)}`;

  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
        {EXPORT_FORMATS.map((f) => (
          <Chip key={f.id} label={f.label} active={format === f.id} onPress={() => setFormat(f.id)} />
        ))}
      </ScrollView>
      <ScrollView style={styles.code} nestedScrollEnabled>
        <Text selectable style={styles.codeText}>
          {code}
        </Text>
      </ScrollView>
      <View style={styles.actions}>
        <Button label="Copy code" icon="copy-outline" variant="solid" style={{ flex: 1 }} onPress={() => void copy(code, { label: `Copied ${filename}` })} />
        <Button label="Share" icon="share-social-outline" style={{ flex: 1 }} onPress={() => void shareText(filename, code)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  code: { maxHeight: 240, borderRadius: 12, backgroundColor: colors.ink900, padding: 14 },
  codeText: { fontFamily: font.mono, fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.9)' },
  actions: { flexDirection: 'row', gap: 8 },
});
