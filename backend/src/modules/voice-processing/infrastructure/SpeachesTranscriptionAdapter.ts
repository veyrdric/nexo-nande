import { Injectable, Logger } from '@nestjs/common';
import { requireEnv } from '../../../shared/env.js';
import type { IAudioTranscriptionPort } from '../domain/ports/IAudioTranscriptionPort.js';

interface TranscriptionResponse {
  text: string;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
};

/** Cliente para Speaches (faster-whisper local, API compatible con OpenAI). docs/02-contratos.md §2 [P1]. */
@Injectable()
export class SpeachesTranscriptionAdapter implements IAudioTranscriptionPort {
  private readonly logger = new Logger(SpeachesTranscriptionAdapter.name);

  async transcribeAudioBuffer(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const baseUrl = requireEnv('STT_BASE_URL');
    const model = requireEnv('STT_MODEL');
    const extension = EXTENSION_BY_MIME[mimeType] ?? 'bin';

    const form = new FormData();
    form.append('model', model);
    form.append('file', new Blob([Uint8Array.from(audioBuffer)], { type: mimeType }), `audio.${extension}`);

    const start = Date.now();
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    const elapsedMs = Date.now() - start;

    if (!response.ok) {
      throw new Error(`Speaches respondió ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as TranscriptionResponse;
    this.logger.log(`Transcripción en ${elapsedMs}ms (${audioBuffer.byteLength} bytes)`);

    return body.text ?? '';
  }
}
