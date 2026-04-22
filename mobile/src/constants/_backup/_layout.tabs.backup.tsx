import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface TabIconProps {
  icon: string;
  label: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, label, focused }) => {
  const { colors, fontWeight } = useTheme();

  const styles = StyleSheet.create({
    tabItem: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minWidth: 70,
    },
    tabIcon: {
      fontSize: 24,
      opacity: 0.4,
    },
    tabIconActive: {
      opacity: 1,
    },
    tabLabel: {
      fontSize: 9,
      fontWeight: fontWeight.bold,
      color: colors.textDisabled,
    },
    tabLabelActive: {
      color: colors.accent,
    },
  });

  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
        {icon}
      </Text>
      <Text 
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

export default function TabsLayout() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    tabBar: {
      height: 80,
      backgroundColor: colors.white,
      borderTopWidth: 1,
      borderTopColor: colors.neutralMuted,
      paddingTop: 8,
      paddingBottom: 20,
    },
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⭐" label="События" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🧘" label="Тренировки" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏃" label="Путь" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Моё" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
