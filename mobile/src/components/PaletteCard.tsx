import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwatchStrip from './SwatchStrip';
import { useAppStore } from '@/store/useAppStore';
import { useLikes } from '~/lib/useLikes';
import { age } from '~/lib/time';
import { colors, radius } from '~/theme';
import type { Palette } from '@/lib/color/types';

export const CARD_STRIP = 112;
export const CARD_FOOTER = 48;
export const CARD_GAP = 14;
export const CARD_HEIGHT = CARD_STRIP + CARD_FOOTER + 2; // + borders

function PaletteCardBase({ palette, onOpen }: { palette: Palette; onOpen: (p: Palette) => void }) {
  const saved = useAppStore((s) => s.favorites.includes(palette.id));
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const likes = useLikes();
  const liked = likes.isLiked(palette.id);

  return (
    <View style={styles.card}>
      <SwatchStrip colors={palette.colors} height={CARD_STRIP} />
      <Pressable
        onPress={() => onOpen(palette)}
        style={({ pressed }) => [styles.footer, pressed && { backgroundColor: colors.canvas }]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${palette.name}`}
      >
        <View style={styles.titleWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {palette.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {palette.colors.length} colors · {age(palette.createdAt)}
          </Text>
        </View>

        <Pressable accessibilityRole="button"
          hitSlop={10}
          onPress={() => toggleFavorite(palette.id, palette)}
          accessibilityLabel={saved ? `Remove ${palette.name} from saved` : `Save ${palette.name}`}
          style={styles.action}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={saved ? colors.accent : colors.ink500}
          />
        </Pressable>

        <Pressable accessibilityRole="button"
          hitSlop={10}
          onPress={() => void likes.toggle(palette)}
          accessibilityLabel={liked ? `Unlike ${palette.name}` : `Like ${palette.name}`}
          style={[styles.action, styles.like]}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.accent : colors.ink500} />
          <Text style={styles.likeCount}>{likes.count(palette)}</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

export default memo(PaletteCardBase);

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  footer: { height: CARD_FOOTER, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 4 },
  titleWrap: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', color: colors.ink900 },
  meta: { fontSize: 11, color: colors.ink300, marginTop: 1 },
  action: { padding: 6 },
  like: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 48, justifyContent: 'flex-end' },
  likeCount: { fontSize: 12, color: colors.ink500, fontVariant: ['tabular-nums'] },
});
