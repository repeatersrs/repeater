import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus, RotateCcw, ArrowRight, Folders } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import DeckCreationDialog from '@/components/deck-creation-dialog';
import { TreeView, TreeDataItem } from '@/components/tree-view';
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupAction,
    useSidebar,
} from '@/components/ui/sidebar';
import { SidebarMenuSkeleton } from '@/components/ui/sidebar';
import { DeckNode } from '@/gen';
import { getDecksTreeDecksTreeGet, updateDeckDecksDeckIdPatch } from '@/gen';

import { AddDeckDropdown } from './add-deck-dropdown';

type MoveDeckArgs = {
    deck_id: string;
    new_parent_id: string | null;
};

export default function NavDecks() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [defaultParentId, setDefaultParentId] = useState<string | undefined>(
        undefined
    );
    const queryClient = useQueryClient();
    const { isMobile, setOpenMobile } = useSidebar();

    const {
        data: deckTree,
        isLoading,
        isError,
        refetch: refetchDeckTree,
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
            toast.error(`Failed to update deck: ${error}`);
            console.error('Failed to update deck:', error);
        },
    });

    function mapToTreeData(items: DeckNode[]): TreeDataItem[] {
        return items.map((item) => ({
            id: item.id,
            name: !item.is_paused ? item.name : `${item.name} (Paused)`,
            className: !item.is_paused ? '' : 'text-muted-foreground',
            children:
                item.children && item.children.length > 0
                    ? mapToTreeData(item.children)
                    : undefined,

            draggable: true,
            droppable: true,
            disabled: false,
            data: item,

            actions: (
                <div className="flex items-center gap-1">
                    <div
                        className="hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
                        onClick={() => {
                            handleClickAddDeck(item.id);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                    </div>
                    <Link
                        to="/decks/$deckId"
                        params={{ deckId: item.id }}
                        className="hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
                        onClick={() => setOpenMobile(false)}
                    >
                        <ArrowRight className="h-4 w-4" />
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
        <>
            {/* Collapsed view - single icon */}
            <SidebarGroup className="hidden group-data-[collapsible=icon]:block">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Decks">
                            <Link to="/decks">
                                <Folders />
                                <span>Decks</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            {/* Expanded view - full tree with label */}
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel>
                    <Link to="/decks" className="flex items-center gap-1.5">
                        <Folders className="size-4" />
                        Decks
                    </Link>
                </SidebarGroupLabel>
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

                <AddDeckDropdown
                    trigger={
                        <SidebarGroupAction
                            title="Add deck"
                            className="cursor-pointer"
                            hidden={isError}
                        >
                            <Plus /> <span className="sr-only">Create deck</span>
                        </SidebarGroupAction>
                    }
                    side={isMobile ? 'bottom' : 'right'}
                    align={isMobile ? 'end' : 'start'}
                />

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
                                onClick={() => refetchDeckTree()}
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
                        className="p-0"
                    />
                )}
            </SidebarGroup>
        </>
    );
}
