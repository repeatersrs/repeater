import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EditorField } from '@/components/EditorField';
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createCardCardsPost, CardCreate, getDecksDecksGet } from '@/gen';

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
    const { data: decks } = useQuery({
        queryKey: ['decks'],
        queryFn: () => getDecksDecksGet(),
    });

    const cardFormSchema = z.object({
        content: z.string().min(1, 'Card must have contents'),
        deck_id: z.string().min(1, 'Card must have a parent deck'),
    }) satisfies z.ZodType<CardCreate>;

    const cardForm = useForm<z.infer<typeof cardFormSchema>>({
        resolver: zodResolver(cardFormSchema),
        defaultValues: {
            content: '',
            deck_id: defaultDeckId || '',
        },
    });

    async function onCardCreate(values: z.infer<typeof cardFormSchema>) {
        try {
            await createCardCardsPost({
                body: {
                    content: values.content,
                    deck_id: values.deck_id,
                },
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
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a deck" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectLabel>
                                                        Deck
                                                    </SelectLabel>
                                                </SelectGroup>
                                                {decks?.data?.map((deck) => (
                                                    <SelectItem
                                                        value={deck.id}
                                                        key={deck.id}
                                                    >
                                                        {deck.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                            placeholder="How are you? \n --- \n Ça va?"
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
