import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

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
import { Input } from '@/components/ui/input';
import { getDeckDecksDeckIdGet } from '@/gen';
import { useDeckForm } from '@/hooks/use-deck-form';

interface DeckCreationDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    defaultParentId?: string;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export default function DeckCreationDialog({
    trigger,
    open,
    defaultParentId,
    onOpenChange,
    onSuccess,
    onError,
}: DeckCreationDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = open ?? internalOpen;
    const setIsOpen = onOpenChange ?? setInternalOpen;

    const { data: parent } = useQuery({
        queryKey: ['decks', defaultParentId],
        queryFn: () =>
            getDeckDecksDeckIdGet({ path: { deck_id: defaultParentId || '' } }),
        enabled: defaultParentId ? true : false,
    });

    const { form: deckForm, onSubmit } = useDeckForm({
        defaultParentId,
        onSuccess: () => {
            setIsOpen(false);
            onSuccess?.();
        },
        onError,
    });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {defaultParentId && parent?.data
                            ? `Create deck under '${parent.data.name}'`
                            : 'Create deck'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...deckForm}>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={deckForm.handleSubmit(onSubmit)}
                    >
                        <FormField
                            control={deckForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">
                                        Deck name
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="Deck name"
                                            className="w-40"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={deckForm.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">
                                        Description
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="Description"
                                            {...field}
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
