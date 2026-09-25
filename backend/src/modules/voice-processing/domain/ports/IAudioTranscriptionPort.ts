// docs/02-contratos.md §2 [P1]
export const AUDIO_TRANSCRIPTION_PORT = Symbol('IAudioTranscriptionPort');

export interface IAudioTranscriptionPort {
  /** Transcribe con Speaches (faster-whisper, local). El buffer se descarta apenas termina. */
  transcribeAudioBuffer(audioBuffer: Buffer, mimeType: string): Promise<string>;
}
