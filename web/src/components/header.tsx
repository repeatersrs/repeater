import { useQuery } from '@tanstack/react-query';
import { useMatch } from '@tanstack/react-router';
import { cn } from '@udecode/cn';
import { CircleCheck, CircleDashed } from 'lucide-react';

import DeckPathBreadcrumbs from '@/components/deck-path-breadcrumbs';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
    getDeckDecksDeckIdGet,
    getReviewSessionReviewSessionGet,
} from '@/gen';

export default function Header({ className }: React.ComponentProps<'div'>) {
    const { isMobile, openMobile } = useSidebar();

    const deckMatch = useMatch({ from: '/decks/$deckId', shouldThrow: false });
    const reviewMatch = useMatch({ from: '/review', shouldThrow: false });

    // Fetch deck if on deck page
    const { data: deck } = useQuery({
        queryKey: ['decks', deckMatch?.params.deckId],
        queryFn: () =>
            getDeckDecksDeckIdGet({
                path: { deck_id: deckMatch!.params.deckId },
            }),
        enabled: !!deckMatch,
    });

    // Fetch review session if on review page
    const {
        data: {
            remainingCards = [],
            failedCards = [],
            completedCards = [],
        } = {},
    } = useQuery({
        queryKey: ['review-session'],
        queryFn: () =>
            getReviewSessionReviewSessionGet({
                query: {
                    exclude_paused: true,
                    exclude_archived: true,
                },
            }),
        select: (response) => ({
            remainingCards: response.data?.remaining,
            failedCards: response.data?.failed,
            completedCards: response.data?.completed,
        }),
        enabled: !!reviewMatch,
    });

    const totalCards =
        remainingCards.length + failedCards.length + completedCards.length;
    const reviewedCards = completedCards.length + failedCards.length;

    const showDeckBreadcrumbs = deckMatch && deck?.data;
    const showReviewProgress = reviewMatch && totalCards > 0;
    const hasContent = showDeckBreadcrumbs || showReviewProgress;

    // Hide on desktop if no content
    if (!hasContent && !isMobile) {
        return null;
    }

    return (
        <header
            className={cn(
                className,
                'relative mx-4 flex h-12 items-center justify-center border-b'
            )}
        >
            {isMobile && !openMobile && (
                <div className="absolute left-0">
                    <SidebarTrigger />
                </div>
            )}

            {showDeckBreadcrumbs && (
                <DeckPathBreadcrumbs
                    path={deck.data.path}
                    showFullPath={true}
                />
            )}

            {showReviewProgress && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    {totalCards == reviewedCards ? (
                        <CircleCheck className="size-4" />
                    ) : (
                        <CircleDashed className="size-4" />
                    )}
                    <span>
                        {reviewedCards} / {totalCards}
                    </span>
                </div>
            )}
        </header>
    );
}
