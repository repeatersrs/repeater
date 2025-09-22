import { z } from 'zod';

import { DeckCreate } from '@/gen';

export const deckFormSchema = z.object({
    name: z.string().min(1, 'Deck name required').max(50),
    description: z.string().optional(),
}) satisfies z.ZodType<DeckCreate>;

export type DeckFormValues = z.infer<typeof deckFormSchema>;
