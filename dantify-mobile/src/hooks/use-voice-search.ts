import { useCallback, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import api from '@/config/api';

type VoiceSearchOptions = {
  onTranscript: (transcript: string) => void;
  language?: string;
};

type TranscriptionResponse = {
  message: string;
  data: {
    transcript: string;
    model: string;
  };
};

export function useVoiceSearch({
  onTranscript,
  language = 'en-IN',
}: VoiceSearchOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const [isFallbackRecording, setIsFallbackRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
    setFallbackAvailable(false);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript?.trim();
    if (transcript) {
      setError(null);
      setFallbackAvailable(false);
      onTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    if (event.error === 'aborted') return;

    const fallbackEligible = [
      'no-speech',
      'service-not-allowed',
      'language-not-supported',
      'network',
      'busy',
    ].includes(event.error);

    setFallbackAvailable(fallbackEligible);

    const messages: Record<string, string> = {
      'not-allowed': 'Microphone or speech recognition permission was not granted. Enable it in your device settings and try again.',
      'service-not-allowed': 'Device speech recognition is unavailable. You can use online transcription instead.',
      'language-not-supported': `The selected speech language (${language}) is not supported by this device. You can use online transcription instead.`,
      'no-speech': 'No speech was detected. You can retry or use online transcription.',
      'audio-capture': 'The microphone could not be started. Check that another app is not using it.',
      network: 'The device speech service could not complete recognition. You can use online transcription instead.',
      busy: 'Speech recognition is busy. You can use online transcription instead.',
    };
    setError(messages[event.error] ?? event.message ?? 'Voice search could not be started.');
  });

  const startOrStop = useCallback(async () => {
    setError(null);
    setFallbackAvailable(false);

    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      setIsAvailable(available);
      if (!available) {
        setError('Device speech recognition is unavailable. You can use online transcription instead.');
        setFallbackAvailable(true);
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone and speech recognition permission are required for device voice search.');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        addsPunctuation: true,
        iosTaskHint: 'search',
      });
    } catch (startError) {
      setIsListening(false);
      setFallbackAvailable(true);
      setError(startError instanceof Error ? startError.message : 'Unable to start device speech recognition. Online transcription is available.');
    }
  }, [isListening, language]);

  const startOrStopFallback = useCallback(async () => {
    setError(null);

    if (isFallbackRecording) {
      try {
        await recorder.stop();
        setIsFallbackRecording(false);
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

        const uri = recorder.uri;
        if (!uri) {
          setError('The audio recording could not be accessed. Please try again.');
          return;
        }

        setIsTranscribing(true);
        const form = new FormData();
        form.append('file', {
          uri,
          name: 'dantify-voice-search.m4a',
          type: 'audio/mp4',
        } as unknown as Blob);

        const response = await api.post<TranscriptionResponse>(
          '/voice/transcriptions',
          form,
          { timeout: 90000 },
        );

        const transcript = response.data?.data?.transcript?.trim();
        if (!transcript) {
          setError('Online transcription did not return any speech. Please try again.');
          return;
        }

        setFallbackAvailable(false);
        onTranscript(transcript);
      } catch (transcriptionError: any) {
        const message =
          transcriptionError?.response?.data?.message ||
          transcriptionError?.message ||
          'Online transcription failed. Please try again.';
        setError(message);
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required for online voice transcription.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsFallbackRecording(true);
      setFallbackAvailable(true);
    } catch (recordingError) {
      setIsFallbackRecording(false);
      setError(
        recordingError instanceof Error
          ? recordingError.message
          : 'Unable to start audio recording.',
      );
    }
  }, [isFallbackRecording, onTranscript, recorder]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isListening,
    isAvailable,
    error,
    startOrStop,
    clearError,
    fallbackAvailable,
    isFallbackRecording,
    isTranscribing,
    startOrStopFallback,
  };
}
