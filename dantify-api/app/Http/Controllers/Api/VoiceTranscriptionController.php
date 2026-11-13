<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class VoiceTranscriptionController extends Controller
{
    /**
     * Transcribe a short voice-search recording.
     *
     * POST /api/voice/transcriptions
     *
     * This endpoint is public because dentist discovery is public. It is
     * protected by an IP-based route throttle and strict upload validation.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:m4a,mp3,wav,webm,ogg,aac,mp4',
                'max:10240',
            ],
        ]);

        $apiKey = (string) config('services.openai.api_key');
        if ($apiKey === '') {
            return response()->json([
                'message' => 'Online voice transcription is not configured. Please use device speech recognition.',
            ], 503);
        }

        $audio = $validated['file'];
        $model = (string) config('services.openai.transcription_model', 'gpt-transcribe');

        try {
            $response = Http::acceptJson()
                ->withToken($apiKey)
                ->connectTimeout(15)
                ->timeout(75)
                ->attach(
                    'file',
                    file_get_contents($audio->getRealPath()),
                    $audio->getClientOriginalName(),
                    ['Content-Type' => $audio->getMimeType() ?: 'application/octet-stream']
                )
                ->post('https://api.openai.com/v1/audio/transcriptions', [
                    'model' => $model,
                    'response_format' => 'json',
                ]);

            if (!$response->successful()) {
                Log::warning('OpenAI voice transcription request failed.', [
                    'status' => $response->status(),
                ]);

                return response()->json([
                    'message' => 'Online transcription is temporarily unavailable. Please try again.',
                ], 502);
            }

            $transcript = trim((string) $response->json('text', ''));

            if ($transcript === '') {
                return response()->json([
                    'message' => 'No speech could be recognized in the recording. Please try again.',
                ], 422);
            }

            return response()->json([
                'message' => 'Voice search transcribed successfully.',
                'data' => [
                    'transcript' => $transcript,
                    'model' => $model,
                ],
            ]);
        } catch (Throwable $exception) {
            Log::error('Voice transcription service error.', [
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Online transcription could not be completed. Please try again.',
            ], 502);
        }
    }
}
