import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle, StyleProp } from 'react-native';
import { borderRadius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface AvatarProps {
  source?: string;
  name?: string;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  style?: StyleProp<ViewStyle & ImageStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 48,
  borderColor,
  borderWidth = 0,
  style,
}) => {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderColor: borderColor || 'transparent',
    borderWidth,
  };

  const imageStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderColor: borderColor || 'transparent',
    borderWidth,
    backgroundColor: colors.neutral,
  };

  useEffect(() => {
    setFailed(false);
  }, [source]);

  if (source && !failed) {
    return (
      <Image
        source={{ uri: source }}
        style={[imageStyle, style as StyleProp<ImageStyle>]}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[{ backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, containerStyle, style]}>
      <Text style={[{ color: colors.text, fontWeight: '600' }, { fontSize: size * 0.4 }]}>
        {name ? getInitials(name) : '?'}
      </Text>
    </View>
  );
};

interface AvatarGroupProps {
  avatars: { source?: string; name?: string }[];
  max?: number;
  size?: number;
  overlap?: number;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 4,
  size = 32,
  overlap = 8,
}) => {
  const { colors } = useTheme();
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <View style={styles.groupContainer}>
      {displayAvatars.map((avatar, index) => (
        <View
          key={index}
          style={[
            styles.groupItem,
            { marginLeft: index === 0 ? 0 : -overlap, zIndex: displayAvatars.length - index },
          ]}
        >
          <Avatar
            source={avatar.source}
            name={avatar.name}
            size={size}
            borderColor={colors.white}
            borderWidth={2}
          />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            { backgroundColor: colors.neutral, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
            { marginLeft: -overlap, width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[{ color: colors.text, fontWeight: '600' }, { fontSize: size * 0.35 }]}>
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {
    position: 'relative',
  },
});
