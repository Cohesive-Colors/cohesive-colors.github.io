import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './ui';
import { colors, font } from '~/theme';

const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

function normalise(v: string): string | null {
  const m = v.trim().match(HEX);
  if (!m) return null;
  let h = m[1]!.toLowerCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h}`;
}

/** Small dialog for pinning an exact colour to a generator slot. */
export default function HexInput({
  initial,
  visible,
  onClose,
  onSubmit,
}: {
  initial: string;
  visible: boolean;
  onClose: () => void;
  onSubmit: (hex: string) => void;
}) {
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial.toUpperCase()), [initial, visible]);
  const parsed = normalise(text);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Pin an exact colour</Text>
          <View style={styles.row}>
            <View style={[styles.preview, { backgroundColor: parsed ?? initial }]} />
            <TextInput
              value={text}
              onChangeText={setText}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              maxLength={7}
              placeholder="#A1B2C3"
              style={styles.input}
              onSubmitEditing={() => parsed && onSubmit(parsed)}
            />
          </View>
          <View style={styles.row}>
            <Button label="Cancel" onPress={onClose} style={{ flex: 1 }} />
            <Button label="Pin" variant="solid" disabled={!parsed} onPress={() => parsed && onSubmit(parsed)} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,20,25,0.55)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 14 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink900 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  preview: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  input: {
    flex: 1, height: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 10,
    paddingHorizontal: 12, fontFamily: font.mono, fontSize: 16, color: colors.ink900,
  },
});
