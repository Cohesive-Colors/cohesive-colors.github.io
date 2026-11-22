import { Pressable, StyleSheet, View } from 'react-native';
import { copyHex } from '~/lib/actions';

/** A row of swatches; tapping one copies its hex. */
export default function SwatchStrip({
  colors,
  height,
  rounded = 0,
}: {
  colors: string[];
  height: number;
  rounded?: number;
}) {
  return (
    <View style={[styles.row, { height, borderRadius: rounded }]}>
      {colors.map((hex, i) => (
        <Pressable accessibilityRole="button"
          key={`${hex}-${i}`}
          onPress={() => void copyHex(hex)}
          accessibilityLabel={`Copy ${hex}`}
          style={({ pressed }) => [styles.swatch, { backgroundColor: hex }, pressed && { flexGrow: 1.5 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%', overflow: 'hidden' },
  swatch: { flex: 1 },
});
