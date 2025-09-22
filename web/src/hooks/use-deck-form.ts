import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { createDeckDecksPost } from '@/gen';
import { deckFormSchema, DeckFormValues } from '@/lib/schemas/deck';

interface UseDeckFormOptions {
    defaultParentId?: string;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export function useDeckForm({
    defaultParentId,
    onSuccess,
    onError,
}: UseDeckFormOptions = {}) {
    const form = useForm<DeckFormValues>({
        resolver: zodResolver(deckFormSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const onSubmit = async (values: DeckFormValues) => {
        try {
            await createDeckDecksPost({
                body: {
                    name: values.name,
                    description: values.description,
                    parent_id: defaultParentId,
                },
            });
            form.reset();
            onSuccess?.();
        } catch (err: unknown) {
            const errorMessage = `There was an error creating deck: ${(err as Error)?.message ?? 'no details found'}`;
            onError?.(errorMessage);
        }
    };

    return {
        form,
        onSubmit,
    };
}
