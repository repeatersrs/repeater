import { Plus } from 'lucide-react';

import DeckCreationDialog from '@/components/deck-creation-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DeckOut } from '@/gen';

interface DecksGridProps {
    decks?: DeckOut[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    onDeckClick: (deckId: string) => void;
    onDeckMouseEnter?: (deckId: string) => void;
    onDeckCreated: () => void;
    showCreateButton?: boolean;
}

export default function DecksGrid({
    decks,
    isLoading,
    isError,
    error,
    onDeckClick,
    onDeckMouseEnter,
    onDeckCreated,
    showCreateButton = true,
}: DecksGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="aspect-[3/4]" />
                ))}
            </div>
        );
    }

    if (isError) {
        return <p className="text-destructive">{error?.message}</p>;
    }

    const hasDecks = decks && decks.length > 0;

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]">
            {showCreateButton && (
                <Card className="flex aspect-[3/4] flex-col items-center justify-center border-2 border-dashed shadow-none">
                    <DeckCreationDialog
                        onSuccess={onDeckCreated}
                        trigger={
                            <Button
                                variant="outline"
                                className="cursor-pointer"
                            >
                                <Plus /> New
                            </Button>
                        }
                    />
                </Card>
            )}

            {hasDecks &&
                decks.map((deck) => (
                    <Card
                        key={deck.id}
                        className="hover:border-foreground/30 flex aspect-[3/4] cursor-pointer flex-col gap-2 px-4 py-0 transition-colors"
                        onMouseEnter={() => onDeckMouseEnter?.(deck.id)}
                        onClick={() => onDeckClick(deck.id)}
                    >
                        <CardHeader className="mt-4 p-0">
                            <h3 className="text-lg font-bold">{deck.name}</h3>
                        </CardHeader>
                        <CardContent className="relative flex-1 overflow-hidden p-0">
                            <p className="text-accent-foreground text-sm">
                                {deck.description}
                            </p>
                            <div className="from-card pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-gradient-to-t to-transparent" />
                        </CardContent>
                    </Card>
                ))}
        </div>
    );
}
