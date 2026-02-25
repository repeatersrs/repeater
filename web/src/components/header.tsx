import { useQuery } from '@tanstack/react-query';
import { useMatch } from '@tanstack/react-router';
import { cn } from '@udecode/cn';

import DeckPathBreadcrumbs from '@/components/deck-path-breadcrumbs';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { getDeckDecksDeckIdGet } from '@/gen';

export default function Header({ className }: React.ComponentProps<'div'>) {
    const { isMobile, openMobile } = useSidebar();

    const deckMatch = useMatch({ from: '/decks/$deckId', shouldThrow: false });
    const reviewMatch = useMatch({ from: '/review', shouldThrow: false });

    const { data: deck } = useQuery({
        queryKey: ['decks', deckMatch?.params.deckId],
        queryFn: () =>
            getDeckDecksDeckIdGet({
                path: { deck_id: deckMatch!.params.deckId },
            }),
        enabled: !!deckMatch,
    });

    const onDecksPage = deckMatch && deck?.data;
    const onReviewPage = !!reviewMatch;

    if (!onDecksPage && !onReviewPage && !isMobile) {
        return null;
    }

    return (
        <header
            className={cn(
                className,
                'relative mx-4 flex h-12 items-center justify-center',
                onDecksPage && 'border-b'
            )}
        >
            {isMobile && !openMobile && (
                <div className="absolute left-0">
                    <SidebarTrigger />
                </div>
            )}

            {onDecksPage && (
                <DeckPathBreadcrumbs
                    path={deck.data.path}
                    showFullPath={true}
                    showDecksRoot={true}
                    highlightLast={true}
                />
            )}
        </header>
    );
}
