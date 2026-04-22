import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { CategoryCard } from '../src/components/CategoryCard';

type CategoryItem = {
  slug: string;
  title: string;
  imageSource: any;
  variant?: 'default' | 'accent' | 'primary';
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: fontSize.xl,
      color: colors.text,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.md,
    },
    cell: {
      width: '48%',
    },
  });

  const categories: CategoryItem[] = [
    {
      slug: 'yoga',
      title: 'Йога',
      imageSource: require('../assets/categories/yoga.jpg'),
      variant: 'default',
    },
    {
      slug: 'running',
      title: 'Бег',
      imageSource: require('../assets/categories/running.jpg'),
      variant: 'accent',
    },
    {
      slug: 'cycling',
      title: 'Велоспорт',
      imageSource: require('../assets/categories/cycling.jpg'),
      variant: 'primary',
    },
    {
      slug: 'strength',
      title: 'Силовые',
      imageSource: require('../assets/categories/strength.jpg'),
      variant: 'default',
    },
    {
      slug: 'swimming',
      title: 'Плавание',
      imageSource: require('../assets/categories/all/swimming.jpg'),
      variant: 'primary',
    },
    {
      slug: 'badminton',
      title: 'Бадминтон',
      imageSource: require('../assets/categories/all/badminton.jpg'),
      variant: 'accent',
    },
    {
      slug: 'tennis',
      title: 'Теннис',
      imageSource: require('../assets/categories/all/tennis.jpg'),
      variant: 'default',
    },
    {
      slug: 'padel',
      title: 'Падел',
      imageSource: require('../assets/categories/all/padel.jpg'),
      variant: 'primary',
    },
    {
      slug: 'team',
      title: 'Групповые виды спорта',
      imageSource: require('../assets/categories/all/team.jpg'),
      variant: 'default',
    },
    {
      slug: 'martial',
      title: 'Единоборства',
      imageSource: require('../assets/categories/all/martial.jpg'),
      variant: 'primary',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Все категории</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {categories.map((c) => (
            <View key={c.slug} style={styles.cell}>
              <CategoryCard
                title={c.title}
                imageSource={c.imageSource}
                variant={c.variant}
                onPress={() => router.push(`/category/${c.slug}`)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
