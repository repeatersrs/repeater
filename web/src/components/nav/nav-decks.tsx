import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, RotateCcw, Folder, FolderOpen, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import DeckCreationDialog from '@/components/deck-creation-dialog';
import { TreeView, TreeDataItem } from '@/components/tree-view';
import { Button } from '@/components/ui/button';
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupAction,
} from '@/components/ui/sidebar';
import { SidebarMenuSkeleton } from '@/components/ui/sidebar';
import { DeckNode } from '@/gen';
import { getDecksTreeDecksTreeGet, updateDeckDecksDeckIdPatch } from '@/gen';

type MoveDeckArgs = {
    deck_id: string;
    new_parent_id: string | null;
};

export function NavDecks() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [defaultParentId, setDefaultParentId] = useState<string | undefined>(
        undefined
    );
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

    const moveDeckMutation = useMutation({
        mutationFn: ({ deck_id, new_parent_id }: MoveDeckArgs) =>
            updateDeckDecksDeckIdPatch({
                path: { deck_id: deck_id },
                body: { parent_id: new_parent_id },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decks'] });
        },
        onError: (error) => {
            // TODO: Add error handling/toast
            console.error('Failed to update deck:', error);
        },
    });

    function mapToTreeData(items: DeckNode[]): TreeDataItem[] {
        return items.map((item) => ({
            id: item.id,
            name: item.name,
            children:
                item.children && item.children.length > 0
                    ? mapToTreeData(item.children)
                    : undefined,

            draggable: true,
            droppable: true,
            disabled: false,
            icon:
                item.children && item.children.length > 0 ? Folder : FolderOpen,
            openIcon: FolderOpen,

            actions: (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        className="h-3 w-3"
                        onClick={() => {
                            handleClickAddDeck(item.id);
                        }}
                    >
                        <Plus />
                    </Button>
                    <Link
                        href={`/decks/${item.id}`}
                        className="flex items-center"
                    >
                        <Button variant="ghost" className="h-3 w-3">
                            <ArrowRight />
                        </Button>
                    </Link>
                </div>
            ),
        }));
    }

    function handleClickAddDeck(deck_id: string) {
        setDefaultParentId(deck_id);
        setIsDialogOpen(true);
    }

    function handleDocumentDrag(source: TreeDataItem, target: TreeDataItem) {
        moveDeckMutation.mutate({
            deck_id: source.id,
            new_parent_id: target.id === '' ? null : target.id,
        });
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Decks</SidebarGroupLabel>

            <DeckCreationDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={() =>
                    queryClient.invalidateQueries({
                        queryKey: ['decks'],
                    })
                }
                defaultParentId={defaultParentId}
            />

            <SidebarGroupAction
                title="Create deck"
                className="cursor-pointer"
                hidden={isError}
                onClick={(_) => {
                    setDefaultParentId(undefined);
                    setIsDialogOpen(true);
                }}
            >
                <Plus /> <span className="sr-only">Create deck</span>
            </SidebarGroupAction>

            {isLoading && !isError && (
                <SidebarMenu>
                    <>
                        <SidebarMenuSkeleton />
                        <SidebarMenuSkeleton />
                        <SidebarMenuSkeleton />
                    </>
                </SidebarMenu>
            )}

            {isError && !isLoading && (
                <SidebarMenu>
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
                </SidebarMenu>
            )}

            {deckTree && deckTree.data?.decks.length === 0 && (
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            disabled
                            className="text-muted-foreground"
                        >
                            No decks created
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            )}

            {deckTree && deckTree.data && (
                <TreeView
                    data={mapToTreeData(deckTree.data.decks)}
                    onDocumentDrag={handleDocumentDrag}
                />
            )}
        </SidebarGroup>
    );
}
