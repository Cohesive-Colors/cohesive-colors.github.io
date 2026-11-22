import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '~/theme';
import type { IconName } from '~/components/ui';

const icon =
  (name: IconName, active: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : name} size={22} color={color} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.canvas },
        headerTitleStyle: { fontWeight: '700', color: colors.ink900 },
        tabBarActiveTintColor: colors.ink900,
        tabBarInactiveTintColor: colors.ink300,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Palettes', tabBarIcon: icon('grid-outline', 'grid') }} />
      <Tabs.Screen
        name="generate"
        options={{ title: 'Generate', tabBarIcon: icon('color-palette-outline', 'color-palette') }}
      />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: icon('bookmark-outline', 'bookmark') }} />
      <Tabs.Screen
        name="about"
        options={{ title: 'About', tabBarIcon: icon('information-circle-outline', 'information-circle') }}
      />
    </Tabs>
  );
}
