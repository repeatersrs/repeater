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

    // Fetch deck if on deck page
    const { data: deck } = useQuery({
        queryKey: ['decks', deckMatch?.params.deckId],
        queryFn: () =>
            getDeckDecksDeckIdGet({
                path: { deck_id: deckMatch!.params.deckId },
            }),
        enabled: !!deckMatch,
    });

    // Sketch v3: Review page renders its own progress header inline.
    // This guard must come after all hook calls to keep hook order stable
    // across route changes.
    if (reviewMatch) {
        return null;
    }

    const onDecksPage = deckMatch && deck?.data;
    const hasContent = onDecksPage;

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
