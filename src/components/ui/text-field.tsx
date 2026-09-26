import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextStyle } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helper?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'name' | 'email' | 'tel' | 'sms-otp' | 'off';
  textContentType?: 'name' | 'emailAddress' | 'telephoneNumber' | 'oneTimeCode' | 'none';
  maxLength?: number;
  multiline?: boolean;
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  keyboardType,
  autoCapitalize = 'sentences',
  autoComplete,
  textContentType,
  maxLength,
  multiline = false,
  inputStyle,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textFaint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize !== 'none'}
        autoComplete={autoComplete}
        textContentType={textContentType}
        maxLength={maxLength}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, inputStyle]}
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
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
  input: {
    minHeight: 54,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  multiline: {
    minHeight: 120,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
  helper: {
    color: Colors.textFaint,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
