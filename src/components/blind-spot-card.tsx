import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { BlindSpot } from '@/lib/types';

export function BlindSpotCard({ spot }: { spot: BlindSpot }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.paper}>
        <View style={styles.seal}>
          <Text style={styles.sealMark}>?</Text>
        </View>
        <Text style={styles.kicker}>Sealed spot</Text>
        <Text style={styles.where}>{spot.neighborhood}</Text>
        <View style={styles.redaction} accessibilityLabel="Venue name hidden">
          <View style={styles.tape} />
          <View style={[styles.tape, styles.tapeShort]} />
        </View>
        <Text style={styles.hint}>{spot.hint}</Text>
        <Text style={styles.note}>The name stays taped shut until you both commit.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 28,
  },
  paper: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.paperInk,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    transform: [{ rotate: '-1.5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  seal: {
    position: 'absolute',
    top: -22,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold,
    borderWidth: 3,
    borderColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealMark: {
    color: Colors.paperInk,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  kicker: {
    marginTop: Spacing.two,
    textAlign: 'center',
    color: Colors.paperInk,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  where: {
    textAlign: 'center',
    color: Colors.paperInk,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
  },
  redaction: {
    alignItems: 'center',
    gap: 6,
    marginVertical: Spacing.one,
  },
  tape: {
    height: 14,
    width: '72%',
    borderRadius: 3,
    backgroundColor: Colors.tape,
    opacity: 0.88,
  },
  tapeShort: {
    width: '46%',
  },
  hint: {
    color: Colors.paperInk,
    fontSize: FontSize.md,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  note: {
    color: Colors.paperInk,
    opacity: 0.72,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
