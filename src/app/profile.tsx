import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GemList } from '@/components/gem-list';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { ScreenContainer } from '@/components/ui/screen-container';
import { TextField } from '@/components/ui/text-field';
import { AVAILABILITY, CUISINES, INTERESTS } from '@/constants/catalog';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { saveAvailability, saveInterests } from '@/lib/api';
import { resetTo } from '@/lib/nav';
import type { Interest, ResidentType } from '@/lib/types';
import { isPhone } from '@/lib/validate';

function interestId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `interest-${Date.now()}`;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export default function ProfileScreen() {
  const { ready, user, onboarded, updateUser, signOut } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl);
  const [residentType, setResidentType] = useState<ResidentType>(user?.residentType ?? 'new');
  const [interests, setInterests] = useState<Interest[]>(user?.interests ?? []);
  const [interestDraft, setInterestDraft] = useState('');
  const [cuisineIds, setCuisineIds] = useState(user?.cuisines ?? []);
  const [availabilityIds, setAvailabilityIds] = useState(user?.availability ?? []);
  const [restaurants, setRestaurants] = useState(user?.localFavorites?.restaurants ?? []);
  const [cafes, setCafes] = useState(user?.localFavorites?.cafes ?? []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/');
  }, [ready, user]);

  async function save() {
    if (!user) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Add the name you want neighbors to see.');
      return;
    }
    if (!isPhone(phone)) {
      setError('The group text needs a real phone number.');
      return;
    }
    const trimmedNeighborhood = neighborhood.trim();
    if (!trimmedNeighborhood) {
      setError('Add your neighborhood.');
      return;
    }
    if (interests.length === 0) {
      setError('Add at least one interest.');
      return;
    }
    if (cuisineIds.length === 0) {
      setError('Choose at least one cuisine.');
      return;
    }
    if (availabilityIds.length === 0) {
      setError('Pick a time you are usually free.');
      return;
    }

    const finishingSetup = !onboarded;
    setSaving(true);
    setError('');
    try {
      const withTastes = await saveInterests(user.id, {
        name: trimmedName,
        phone: phone.trim(),
        neighborhood: trimmedNeighborhood,
        residentType,
        interests,
        cuisines: cuisineIds,
        localFavorites: residentType === 'local' ? { restaurants, cafes } : undefined,
      });
      const saved = await saveAvailability(withTastes.id, availabilityIds);
      await updateUser({ ...saved, photoUrl }, { onboarded: true });
      if (finishingSetup) resetTo('/home');
      else if (router.canGoBack()) router.back();
      else resetTo('/home');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your page.');
      setSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Log out?', 'You can walk through the intro again on this phone.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => resetTo('/'));
        },
      },
    ]);
  }

  function addTypedInterest() {
    const label = interestDraft.trim();
    if (!label) return;
    const known = INTERESTS.find((item) => item.label.toLowerCase() === label.toLowerCase());
    const next = known ?? { id: interestId(label), label };
    setInterests((current) => {
      const exists = current.some(
        (item) => item.id === next.id || item.label.toLowerCase() === label.toLowerCase(),
      );
      return exists ? current : [...current, next];
    });
    setInterestDraft('');
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setError('');
      setPhotoUrl(result.assets[0].uri);
    }
  }

  const extraInterests = interests.filter((item) => !INTERESTS.some((preset) => preset.id === item.id));

  if (!user) return <View style={styles.boot} />;

  return (
    <ScreenContainer
      scroll
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={onboarded ? 'Save' : 'Find a match'} onPress={() => void save()} loading={saving} />
        </>
      }>
      {onboarded ? (
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      ) : null}
      <Text style={styles.kicker}>{onboarded ? 'Your page' : 'Set the table'}</Text>
      <Text style={styles.title}>{onboarded ? 'Edit your corner' : 'Your corner of the city'}</Text>
      <Text style={styles.body}>Neighbors match on taste. The spot stays a secret until you both commit.</Text>

      <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} style={styles.photoButton}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={styles.photoFallback}>
            <Text style={styles.photoInitial}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.photoLabel}>{photoUrl ? 'Change photo' : 'Add a photo'}</Text>
      </Pressable>

      <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        helper="Needed for the group text. It stays off your public profile."
      />
      <TextField
        label="Neighborhood"
        value={neighborhood}
        onChangeText={setNeighborhood}
        placeholder="Harlem, Astoria, Bed-Stuy"
        autoCapitalize="words"
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In the city</Text>
        <View style={styles.toggleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: residentType === 'new' }}
            onPress={() => setResidentType('new')}
            style={[styles.toggle, residentType === 'new' && styles.toggleOn]}>
            <Text style={[styles.toggleLabel, residentType === 'new' && styles.toggleLabelOn]}>New to NYC</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: residentType === 'local' }}
            onPress={() => setResidentType('local')}
            style={[styles.toggle, residentType === 'local' && styles.toggleOn]}>
            <Text style={[styles.toggleLabel, residentType === 'local' && styles.toggleLabelOn]}>Local</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <Text style={styles.hint}>Type your own, or tap a bubble. Tap a filled bubble to take it off.</Text>
        <View style={styles.addRow}>
          <TextInput
            value={interestDraft}
            onChangeText={setInterestDraft}
            placeholder="Jazz, thrifting, dumplings"
            placeholderTextColor={Colors.textFaint}
            onSubmitEditing={addTypedInterest}
            returnKeyType="done"
            autoCapitalize="words"
            style={styles.addInput}
          />
          <Pressable accessibilityRole="button" onPress={addTypedInterest} style={styles.addButton}>
            <Text style={styles.addLabel}>Add</Text>
          </Pressable>
        </View>
        <View style={styles.bubbles}>
          {INTERESTS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={interests.some((interest) => interest.id === item.id)}
              onPress={() => {
                const selected = interests.some((interest) => interest.id === item.id);
                setInterests((current) =>
                  selected ? current.filter((interest) => interest.id !== item.id) : [...current, item],
                );
              }}
            />
          ))}
          {extraInterests.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected
              accessibilityLabel={`Remove ${item.label}`}
              onPress={() => setInterests((current) => current.filter((interest) => interest.id !== item.id))}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Food</Text>
        <Text style={styles.hint}>Cuisines you actually want to eat.</Text>
        <ChoiceGroup options={CUISINES} selected={cuisineIds} onToggle={(id) => setCuisineIds((current) => toggle(current, id))} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usually free</Text>
        <ChoiceGroup
          options={AVAILABILITY}
          selected={availabilityIds}
          onToggle={(id) => setAvailabilityIds((current) => toggle(current, id))}
        />
      </View>

      {residentType === 'local' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local favorites</Text>
          <Text style={styles.hint}>Restaurants and cafes you'd send a friend to. The quiet ones count.</Text>
          <GemList
            label="Restaurants"
            placeholder="A spot with no sign"
            items={restaurants}
            onChange={setRestaurants}
          />
          <GemList label="Cafes" placeholder="Three tables and good light" items={cafes} onChange={setCafes} />
        </View>
      ) : null}

      <Button label="Log out" variant="ghost" onPress={confirmLogout} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: Colors.gold,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  kicker: {
    color: Colors.gold,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    lineHeight: 38,
  },
  body: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  hint: {
    color: Colors.textFaint,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggle: {
    flex: 1,
    minHeight: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingHorizontal: Spacing.two,
  },
  toggleOn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  toggleLabel: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  toggleLabelOn: {
    color: Colors.ink,
  },
  error: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  photoButton: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  photo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: Colors.surface,
  },
  photoFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  photoInitial: {
    color: Colors.gold,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
  },
  photoLabel: {
    color: Colors.gold,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addInput: {
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
  addButton: {
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
  bubbles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
