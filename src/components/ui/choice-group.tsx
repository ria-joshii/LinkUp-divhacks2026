import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';

type Option = {
  id: string;
  label: string;
};

type Props = {
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
};

export function ChoiceGroup({ options, selected, onToggle }: Props) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => (
        <Chip
          key={option.id}
          label={option.label}
          selected={selected.includes(option.id)}
          onPress={() => onToggle(option.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
