import { z } from 'zod';

// docs/02-contratos.md §6. MAX_USER_MESSAGE_CHARS: límite de entrada (.env.example).
const maxMessageChars = Number(process.env.MAX_USER_MESSAGE_CHARS ?? 1000);

export const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(maxMessageChars),
});

export type ChatRequestDto = z.infer<typeof chatRequestSchema>;
