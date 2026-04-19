import { Plus } from 'lucide-react';
import Markdown from 'react-markdown';

import CardCreationDialog from '@/components/card-creation-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CardOut } from '@/gen';

interface CardsGridProps {
    cards?: CardOut[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    onCardClick: (cardIndex: number) => void;
    onCardMouseEnter: (cardId: string) => void;
    onCardCreated: () => void;
    showCreateButton?: boolean;
    defaultDeckId?: string;
}

export default function CardsGrid({
    cards,
    isLoading,
    isError,
    error,
    onCardClick,
    onCardMouseEnter,
    onCardCreated,
    showCreateButton = true,
    defaultDeckId,
}: CardsGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="aspect-[3/4]" />
                ))}
            </div>
        );
    }

    if (isError) {
        return <p className="text-destructive">{error?.message}</p>;
    }

    const hasCards = cards && cards.length > 0;

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]">
            {showCreateButton && (
                <Card className="flex aspect-[3/4] flex-col items-center justify-center border-2 border-dashed shadow-none">
                    <CardCreationDialog
                        onSuccess={onCardCreated}
                        defaultDeckId={defaultDeckId}
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

            {hasCards &&
                cards.map((card, cardIndex) => (
                    <Card
                        key={card.id}
                        className="hover:border-foreground/30 flex aspect-[3/4] cursor-pointer flex-col gap-1 px-4 py-0 transition-colors"
                        onMouseEnter={() => onCardMouseEnter(card.id)}
                        onClick={() => onCardClick(cardIndex)}
                    >
                        <CardHeader className="mt-4 p-0">
                            <p className="text-accent-foreground text-xs">
                                {card.deck_name}
                            </p>
                        </CardHeader>
                        <CardContent className="relative flex-1 overflow-hidden p-0">
                            {card.content.split('---').map((content, index) => (
                                <div key={index}>
                                    {index !== 0 && (
                                        <Separator className="my-1" />
                                    )}
                                    <Markdown>{content}</Markdown>
                                </div>
                            ))}
                            <div className="from-card pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-gradient-to-t to-transparent" />
                        </CardContent>
                    </Card>
                ))}
        </div>
    );
}
