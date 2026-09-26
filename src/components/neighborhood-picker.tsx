import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NEIGHBORHOODS } from '@/constants/catalog';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  value?: string;
  onChange: (neighborhood: string) => void;
};

export function NeighborhoodPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Neighborhood</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `Neighborhood, ${value}` : 'Choose a neighborhood'}
        onPress={() => setOpen(true)}
        style={styles.field}>
        <Text style={value ? styles.value : styles.placeholder}>{value ?? 'Choose a neighborhood'}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <Text style={styles.sheetTitle}>Your neighborhood</Text>
          <ScrollView>
            {NEIGHBORHOODS.map((neighborhood) => {
              const selected = neighborhood === value;
              return (
                <Pressable
                  key={neighborhood}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(neighborhood);
                    setOpen(false);
                  }}
                  style={[styles.row, selected && styles.rowSelected]}>
                  <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>{neighborhood}</Text>
                  {selected ? <View style={styles.dot} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  label: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  field: {
    minHeight: 54,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  placeholder: {
    color: Colors.textFaint,
    fontSize: FontSize.md,
  },
  chevron: {
    color: Colors.gold,
    fontSize: FontSize.md,
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingHorizontal: Spacing.one,
  },
  rowSelected: {
    backgroundColor: Colors.surfaceRaised,
  },
  rowLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  rowLabelSelected: {
    color: Colors.gold,
    fontWeight: '700',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
  },
});
