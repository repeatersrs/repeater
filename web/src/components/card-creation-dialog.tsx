import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DeckSelector } from '@/components/deck-selector';
import { EditorField } from '@/components/editor-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { createCardCardsPost, CardCreate } from '@/gen';
import { validateCardContent, serializeToMarkdown } from '@/lib/editor-utils';

interface CardCreationDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    defaultDeckId?: string;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export default function CardCreationDialog({
    trigger,
    open,
    defaultDeckId,
    onOpenChange,
    onSuccess,
    onError,
}: CardCreationDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = open ?? internalOpen;
    const setIsOpen = onOpenChange ?? setInternalOpen;

    const cardFormSchema = z.object({
        content: z
            .array(z.any())
            .min(1)
            .refine(validateCardContent, { message: 'Content is required' }),
        deck_id: z.string().min(1, 'Card must have a parent deck'),
    });

    const cardForm = useForm<z.infer<typeof cardFormSchema>>({
        resolver: zodResolver(cardFormSchema),
        defaultValues: {
            content: [{ type: 'p', children: [{ text: '' }] }],
            deck_id: defaultDeckId || '',
        },
    });

    async function onCardCreate(values: z.infer<typeof cardFormSchema>) {
        try {
            const markdownContent = serializeToMarkdown(values.content);

            const payload: CardCreate = {
                content: markdownContent,
                deck_id: values.deck_id,
            };
            await createCardCardsPost({
                body: payload,
            });
            cardForm.reset();
            setIsOpen(false);

            onSuccess?.();
        } catch (err: unknown) {
            const errorMessage = `There was an error creating card: ${(err as Error)?.message ?? 'no details found'}`;
            onError?.(errorMessage);
        }
    }
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create card</DialogTitle>
                </DialogHeader>
                <Form {...cardForm}>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={cardForm.handleSubmit(onCardCreate)}
                    >
                        <FormField
                            control={cardForm.control}
                            name="deck_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">
                                        Select a Deck
                                    </FormLabel>
                                    <FormControl>
                                        <DeckSelector
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={cardForm.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">
                                        Content
                                    </FormLabel>
                                    <FormControl>
                                        <EditorField
                                            {...field}
                                            placeholder="Enter card content..."
                                            className="h-36"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Close
                                </Button>
                            </DialogClose>
                            <Button type="submit">Create</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
