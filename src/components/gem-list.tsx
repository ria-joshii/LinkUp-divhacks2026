import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
};

export function GemList({ label, placeholder, items, onChange }: Props) {
  const [draft, setDraft] = useState('');

  function add() {
    const name = draft.trim();
    if (!name) return;
    const exists = items.some((item) => item.toLowerCase() === name.toLowerCase());
    if (!exists) onChange([...items, name]);
    setDraft('');
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={Colors.textFaint}
          onSubmitEditing={add}
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable accessibilityRole="button" onPress={add} style={styles.add}>
          <Text style={styles.addLabel}>Add</Text>
        </Pressable>
      </View>
      {items.length > 0 ? (
        <View style={styles.chips}>
          {items.map((item) => (
            <Chip
              key={item}
              label={item}
              selected
              accessibilityLabel={`Remove ${item}`}
              onPress={() => onChange(items.filter((entry) => entry !== item))}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  label: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 54,
    margin: 0,
    paddingVertical: 0,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  add: {
    width: 72,
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
  },
  addLabel: {
    color: Colors.ink,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
