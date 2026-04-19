import { useQuery } from '@tanstack/react-query';
import { Link, useMatch } from '@tanstack/react-router';
import { Repeat } from 'lucide-react';

import DeckPathBreadcrumbs from '@/components/deck-path-breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { getDeckDecksDeckIdGet } from '@/gen';

/**
 * Mobile-only top strip mounted once from the root route. Sidebar trigger on
 * the left; centered content varies by route. Desktop hides it.
 */
export default function MobileAppBar() {
    const reviewMatch = useMatch({ from: '/review', shouldThrow: false });
    const deckMatch = useMatch({
        from: '/decks/$deckId',
        shouldThrow: false,
    });

    const { data: deck } = useQuery({
        queryKey: ['decks', deckMatch?.params.deckId],
        queryFn: () =>
            getDeckDecksDeckIdGet({
                path: { deck_id: deckMatch!.params.deckId },
            }),
        enabled: !!deckMatch,
    });

    return (
        <div className="bg-sidebar border-sidebar-border sticky top-0 z-10 flex h-12 shrink-0 items-center justify-center border-b md:hidden">
            <SidebarTrigger className="absolute left-2" />
            <div className="min-w-0 truncate px-12">
                {reviewMatch && (
                    <Link
                        to="/review"
                        className="flex items-center gap-2 text-base font-semibold"
                    >
                        <Repeat className="size-4" />
                        <span>Repeater</span>
                    </Link>
                )}
                {deckMatch && deck?.data && (
                    <DeckPathBreadcrumbs
                        path={deck.data.path}
                        showFullPath={false}
                        showDecksRoot
                        highlightLast
                    />
                )}
            </div>
        </div>
    );
}
