import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Colors, FontFamily, FontSize, Radius } from '@/constants/theme';
import { foodPreference, initial } from '@/lib/people';
import type { User } from '@/lib/types';

type Props = {
  name: string;
  photoUrl?: string;
  size?: number;
};

export function Avatar({ name, photoUrl, size = 72 }: Props) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoUrl) && !failed;

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {showPhoto ? (
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          contentFit="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={`${name} photo`}
        />
      ) : (
        <Text style={[styles.letter, { fontSize: size * 0.38 }]}>{initial(name)}</Text>
      )}
    </View>
  );
}

export function PersonFace({ person }: { person: User }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(person.photoUrl) && !failed;

  return (
    <View style={styles.face}>
      <View style={styles.photoWrap}>
        {showPhoto ? (
          <Image
            source={{ uri: person.photoUrl }}
            style={styles.photo}
            contentFit="cover"
            onError={() => setFailed(true)}
            accessibilityLabel={`${person.name} photo`}
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackLetter}>{initial(person.name)}</Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={2}>
          {person.name}
          {person.age ? <Text style={styles.age}>  {person.age}</Text> : null}
        </Text>
        {person.neighborhood ? <Text style={styles.neighborhood}>{person.neighborhood}</Text> : null}
        <Text style={styles.food} numberOfLines={2}>
          Down for {foodPreference(person)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  face: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  photoWrap: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A2A22',
  },
  fallbackLetter: {
    color: Colors.gold,
    fontFamily: FontFamily.display,
    fontSize: 72,
  },
  letter: {
    color: Colors.gold,
    fontFamily: FontFamily.display,
  },
  meta: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  name: {
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
  },
  age: {
    color: Colors.textMuted,
    fontFamily: FontFamily.display,
    fontSize: FontSize.lg,
  },
  neighborhood: {
    color: Colors.gold,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  food: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
});
