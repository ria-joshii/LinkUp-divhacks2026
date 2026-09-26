import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PersonFace } from '@/components/person-face';
import { Colors, FontSize, Radius } from '@/constants/theme';
import type { User } from '@/lib/types';

export type SwipeDirection = 'left' | 'right';

type DeckProps = {
  people: User[];
  index: number;
  exit: SwipeDirection | null;
  enabled: boolean;
  onCommit: (direction: SwipeDirection) => void;
  onExitDone: (direction: SwipeDirection) => void;
};

export function SwipeDeck({ people, index, exit, enabled, onCommit, onExitDone }: DeckProps) {
  const person = people[index];
  const next = people[index + 1];
  if (!person) return null;

  return (
    <View style={styles.deck}>
      {next ? (
        <View pointerEvents="none" style={[styles.layer, styles.behind]}>
          <PersonFace person={next} />
        </View>
      ) : null}
      <SwipeCard
        key={person.id}
        person={person}
        exit={exit}
        enabled={enabled}
        onCommit={onCommit}
        onExitDone={onExitDone}
      />
    </View>
  );
}

function SwipeCard({
  person,
  exit,
  enabled,
  onCommit,
  onExitDone,
}: {
  person: User;
  exit: SwipeDirection | null;
  enabled: boolean;
  onCommit: (direction: SwipeDirection) => void;
  onExitDone: (direction: SwipeDirection) => void;
}) {
  'use no memo';
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const commitRef = useRef(onCommit);
  const doneRef = useRef(onExitDone);
  commitRef.current = onCommit;
  doneRef.current = onExitDone;

  const commit = useCallback((direction: SwipeDirection) => {
    commitRef.current(direction);
  }, []);
  const finish = useCallback((direction: SwipeDirection) => {
    doneRef.current(direction);
  }, []);

  useEffect(() => {
    if (!exit) {
      translateX.value = 0;
      translateY.value = 0;
      return;
    }
    const distance = exit === 'right' ? 560 : -560;
    translateX.value = withTiming(distance, { duration: 240 }, (finished) => {
      if (finished) runOnJS(finish)(exit);
    });
  }, [exit, finish, translateX, translateY]);

  const pan = Gesture.Pan()
    .enabled(enabled && !exit)
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.12;
    })
    .onEnd((event) => {
      const right = event.translationX > 110 || event.velocityX > 900;
      const left = event.translationX < -110 || event.velocityX < -900;
      if (right) {
        runOnJS(commit)('right');
        return;
      }
      if (left) {
        runOnJS(commit)('left');
        return;
      }
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(translateX.value, [-220, 0, 220], [-8, 0, 8], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [24, 120], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-24, -120], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.layer, cardStyle]}>
        <PersonFace person={person} />
        <Animated.View pointerEvents="none" style={[styles.stamp, styles.likeStamp, likeStyle]}>
          <Text style={[styles.stampText, styles.likeText]}>IN</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.stamp, styles.passStamp, passStyle]}>
          <Text style={[styles.stampText, styles.passText]}>PASS</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
  },
  layer: {
    ...StyleSheet.absoluteFill,
  },
  behind: {
    transform: [{ scale: 0.96 }, { translateY: 12 }],
  },
  stamp: {
    position: 'absolute',
    top: 28,
    borderWidth: 3,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  likeStamp: {
    left: 18,
    borderColor: Colors.accent,
    transform: [{ rotate: '-12deg' }],
  },
  passStamp: {
    right: 18,
    borderColor: Colors.text,
    transform: [{ rotate: '12deg' }],
  },
  stampText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 1,
  },
  likeText: {
    color: Colors.accent,
  },
  passText: {
    color: Colors.text,
  },
});
