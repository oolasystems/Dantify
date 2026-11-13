import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { IconSymbol } from '@/components/icon-symbol';
import { useAppColors } from '@/hooks/use-app-colors';

type PublicSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSearch: () => void;
  onVoiceSearch: () => void;
  placeholder?: string;
  accessibilityLabel?: string;
  helperText?: string;
  voiceDisabled?: boolean;
  voiceListening?: boolean;
  fallbackAvailable?: boolean;
  fallbackRecording?: boolean;
  fallbackLoading?: boolean;
  onFallbackPress?: () => void;
};

export default function PublicSearchBar({
  value,
  onChangeText,
  onSearch,
  onVoiceSearch,
  placeholder = 'Dentist, treatment or dental concern',
  accessibilityLabel = 'Search dentists, clinics or dental services',
  helperText,
  voiceDisabled = false,
  voiceListening = false,
  fallbackAvailable = false,
  fallbackRecording = false,
  fallbackLoading = false,
  onFallbackPress,
}: PublicSearchBarProps) {
  const colors = useAppColors();

  return (
    <View style={{ gap: 7 }}>
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 16,
          backgroundColor: colors.surface,
          paddingLeft: 12,
          paddingRight: 5,
          gap: 3,
        }}
      >
        <IconSymbol name="magnifyingglass" size={19} color={colors.textMuted} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSearch}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect
          autoCapitalize="sentences"
          multiline={false}
          style={{
            flex: 1,
            minWidth: 0,
            color: colors.text,
            fontSize: 14,
            paddingHorizontal: 7,
            paddingVertical: 11,
          }}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Enter a dentist name, specialization or search phrase, then tap Search"
        />

        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={7}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={{
              width: 32,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
            }}
          >
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={onVoiceSearch}
          disabled={voiceDisabled}
          hitSlop={5}
          accessibilityRole="button"
          accessibilityLabel={voiceListening ? 'Stop voice search' : 'Start voice search'}
          accessibilityState={{ disabled: voiceDisabled }}
          style={{
            width: 38,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            opacity: voiceDisabled ? 0.45 : 1,
          }}
        >
          <IconSymbol name={voiceListening ? "speaker.wave.2.fill" : "mic.fill"} size={19} color={voiceListening ? colors.danger : colors.primary} />
        </Pressable>

        <Pressable
          onPress={onSearch}
          accessibilityRole="button"
          accessibilityLabel="Search"
          style={({ pressed }) => ({
            minWidth: 66,
            height: 42,
            paddingHorizontal: 13,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 11,
            backgroundColor: colors.primary,
            opacity: pressed ? 0.82 : 1,
          })}
        >
          <AppText style={{ color: colors.badgeText, fontSize: 13, fontWeight: '700' }}>
            Search
          </AppText>
        </Pressable>
      </View>

      {helperText ? (
        <AppText style={{ color: colors.textMuted, fontSize: 11, lineHeight: 16 }}>
          {helperText}
        </AppText>
      ) : null}

      {fallbackAvailable && onFallbackPress ? (
        <Pressable
          onPress={onFallbackPress}
          disabled={fallbackLoading}
          accessibilityRole="button"
          accessibilityLabel={
            fallbackLoading
              ? 'Transcribing voice search'
              : fallbackRecording
                ? 'Stop recording and transcribe'
                : 'Use online voice transcription'
          }
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            opacity: pressed || fallbackLoading ? 0.7 : 1,
          })}
        >
          <IconSymbol
            name={fallbackLoading ? 'hourglass' : fallbackRecording ? 'stop.fill' : 'cloud'}
            size={15}
            color={colors.primary}
          />
          <AppText style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
            {fallbackLoading
              ? 'Transcribing…'
              : fallbackRecording
                ? 'Stop and transcribe'
                : 'Use online transcription'}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
