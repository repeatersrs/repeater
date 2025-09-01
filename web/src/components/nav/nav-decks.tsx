import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw } from 'lucide-react';

import DeckCreationDialog from '@/components/deck-creation-dialog';
import DeckTreeNode from '@/components/deck-tree-node';
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupAction,
} from '@/components/ui/sidebar';
import { SidebarMenuSkeleton } from '@/components/ui/sidebar';
import { getDecksTreeDecksTreeGet } from '@/gen';

export function NavDecks() {
    const queryClient = useQueryClient();
    const {
        data: deckTree,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['decks', 'tree'],
        queryFn: () => getDecksTreeDecksTreeGet(),
    });

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Decks</SidebarGroupLabel>

            <DeckCreationDialog
                onSuccess={() =>
                    queryClient.invalidateQueries({
                        queryKey: ['decks'],
                    })
                }
                trigger={
                    <SidebarGroupAction
                        title="Create deck"
                        className="cursor-pointer"
                        hidden={isError}
                    >
                        <Plus /> <span className="sr-only">Create deck</span>
                    </SidebarGroupAction>
                }
            />

            <SidebarMenu>
                {isLoading && !isError && (
                    <>
                        <SidebarMenuSkeleton />
                        <SidebarMenuSkeleton />
                        <SidebarMenuSkeleton />
                    </>
                )}

                {isError && !isLoading && (
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            className="text-destructive hover:text-destructive/90 active:text-destructive flex h-fit cursor-pointer justify-between"
                            onClick={() => refetch()}
                            aria-label="Retry loading decks"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-sm">
                                    Failed to load decks.
                                </span>
                                <span className="text-xs opacity-70">
                                    Click to try again
                                </span>
                            </div>
                            <RotateCcw />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                {deckTree && deckTree.data?.decks.length === 0 && (
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            disabled
                            className="text-muted-foreground"
                        >
                            No decks created
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                {deckTree &&
                    deckTree.data?.decks.map((deck) => (
                        <DeckTreeNode key={deck.id} deck={deck} />
                    ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
