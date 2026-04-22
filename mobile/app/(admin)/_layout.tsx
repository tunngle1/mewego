import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

function TabIcon({
  name,
  focused,
  styles,
}: {
  name: string;
  focused: boolean;
  styles: any;
}) {
  const icons: Record<string, string> = {
    dashboard: '🏠',
    events: '📋',
    users: '👥',
    settings: '⚙️',
    complaints: '⚠️',
    'ban-appeals': '🚫',
    logs: '📜',
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
        {icons[name] || '📄'}
      </Text>
    </View>
  );
}

export default function AdminLayout() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight),
    [colors, spacing, fontSize, fontWeight]
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Главная',
          tabBarIcon: ({ focused }) => <TabIcon name="dashboard" focused={focused} styles={styles} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Модерация',
          tabBarIcon: ({ focused }) => <TabIcon name="events" focused={focused} styles={styles} />,
        }}
      />

      <Tabs.Screen
        name="complaints"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="ban-appeals"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="event-edit-requests"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Пользователи',
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} styles={styles} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} styles={styles} />,
        }}
      />
    </Tabs>
  );
}

const createStyles = (
  colors: any,
  spacing: any,
  fontSize: any,
  fontWeight: any
) => StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutralMuted,
    height: 80,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmoji: {
    fontSize: 24,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
  },
});
