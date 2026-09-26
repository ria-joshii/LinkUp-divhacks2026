import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GemList } from '@/components/gem-list';
import { NeighborhoodPicker } from '@/components/neighborhood-picker';
import { Button } from '@/components/ui/button';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { ScreenContainer } from '@/components/ui/screen-container';
import { TextField } from '@/components/ui/text-field';
import { AVAILABILITY, CUISINES, INTERESTS } from '@/constants/catalog';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { saveAvailability, saveInterests } from '@/lib/api';
import { resetTo } from '@/lib/nav';
import type { ResidentType } from '@/lib/types';
import { isPhone } from '@/lib/validate';

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export default function ProfileScreen() {
  const { ready, user, onboarded, updateUser, signOut } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood);
  const [residentType, setResidentType] = useState<ResidentType>(user?.residentType ?? 'new');
  const [interestIds, setInterestIds] = useState(user?.interests.map((item) => item.id) ?? []);
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
    if (!neighborhood) {
      setError('Pick a neighborhood.');
      return;
    }
    if (interestIds.length === 0) {
      setError('Choose at least one interest.');
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
        neighborhood,
        residentType,
        interests: INTERESTS.filter((item) => interestIds.includes(item.id)),
        cuisines: cuisineIds,
        localFavorites: residentType === 'local' ? { restaurants, cafes } : undefined,
      });
      const saved = await saveAvailability(withTastes.id, availabilityIds);
      await updateUser(saved, { onboarded: true });
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

      <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        helper="Needed for the group text. It stays off your public card."
      />
      <NeighborhoodPicker value={neighborhood} onChange={setNeighborhood} />

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
        <Text style={styles.hint}>What should a night together be built around?</Text>
        <ChoiceGroup options={INTERESTS} selected={interestIds} onToggle={(id) => setInterestIds((current) => toggle(current, id))} />
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
});
