import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabItemProps {
  icon: IconName;
  iconFocused: IconName;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ icon, iconFocused, label, focused, onPress, onLongPress }) => {
  const { colors, fontWeight } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Ionicons
        name={focused ? iconFocused : icon}
        size={24}
        color={focused ? colors.accent : colors.textMuted}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.accent : colors.textMuted, fontWeight: fontWeight.semibold },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface CenterButtonProps {
  onPress: () => void;
}

const CenterButton: React.FC<CenterButtonProps> = ({ onPress }) => {
  const { colors, shadows } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.centerButton,
        {
          backgroundColor: colors.accent,
          ...shadows.lg,
        },
      ]}
    >
      <Ionicons name="add" size={32} color={colors.white} />
    </TouchableOpacity>
  );
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, borderRadius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  const isOrganizer =
    user?.role === 'organizer' || user?.role === 'admin' || user?.role === 'superadmin';

  const TAB_CONFIG: Record<string, { icon: IconName; iconFocused: IconName; label: string }> = {
    explore: { icon: 'star-outline', iconFocused: 'star', label: 'События' },
    bookings: { icon: 'calendar-outline', iconFocused: 'calendar', label: 'Тренировки' },
    challenges: { icon: 'analytics-outline', iconFocused: 'analytics', label: 'Путь' },
    profile: { icon: 'person-outline', iconFocused: 'person', label: 'Моё' },
  };

  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginHorizontal: 16,
    marginBottom: insets.bottom > 0 ? insets.bottom : 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...shadows.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  };

  const handleCreateEvent = () => {
    router.push('/organizer-event/create');
  };

  // Build tabs with optional center FAB for organizers
  const renderTabs = () => {
    const elements: React.ReactNode[] = [];
    const routeNames = state.routes.map((r: any) => r.name);

    state.routes.forEach((route: any, index: number) => {
      const { options } = descriptors[route.key];
      const isFocused = state.index === index;
      const config = TAB_CONFIG[route.name];

      if (!config) return;

      const onPress = () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };

      const onLongPress = () => {
        navigation.emit({
          type: 'tabLongPress',
          target: route.key,
        });
      };

      elements.push(
        <TabItem
          key={route.key}
          icon={config.icon}
          iconFocused={config.iconFocused}
          label={config.label}
          focused={isFocused}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      );

      // Insert FAB after 2nd tab (bookings) for organizers only
      if (index === 1 && isOrganizer) {
        elements.push(
          <CenterButton key="fab-create" onPress={handleCreateEvent} />
        );
      }
    });

    return elements;
  };

  return (
    <View style={[styles.tabBarContainer, tabBarStyle]}>
      {renderTabs()}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="challenges" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
});
