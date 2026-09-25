import { Module } from '@nestjs/common';
import { AUDIO_TRANSCRIPTION_PORT } from './domain/ports/IAudioTranscriptionPort.js';
import { SpeachesTranscriptionAdapter } from './infrastructure/SpeachesTranscriptionAdapter.js';

@Module({
  providers: [{ provide: AUDIO_TRANSCRIPTION_PORT, useClass: SpeachesTranscriptionAdapter }],
  exports: [AUDIO_TRANSCRIPTION_PORT],
})
export class VoiceProcessingModule {}
