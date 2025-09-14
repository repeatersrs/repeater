import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
    Plus,
    RotateCcw,
    Folder,
    FolderOpen,
    ArrowRight,
    ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import DeckCreationDialog from '@/components/deck-creation-dialog';
import { TreeView, TreeDataItem } from '@/components/tree-view';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
    const { isMobile } = useSidebar();

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
            icon:
                item.children && item.children.length > 0 ? Folder : FolderOpen,
            openIcon: FolderOpen,
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
                        href={`/decks/${item.id}`}
                        className="hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
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
            <SidebarGroupActionAddDeckDropdown />
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
                />
            )}
        </SidebarGroup>
    );

    function SidebarGroupActionAddDeckDropdown() {
        enum DropdownState {
            initial,
            creation,
            import,
        }

        const [dropdownState, setDropdownState] = useState(
            DropdownState.initial
        );
        const [deckName, setDeckName] = useState('');
        const [deckDescription, setDeckDescription] = useState('');

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarGroupAction
                        title="Add deck"
                        className="cursor-pointer"
                        hidden={isError}
                    >
                        <Plus /> <span className="sr-only">Create deck</span>
                    </SidebarGroupAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side={isMobile ? 'bottom' : 'right'}>
                    {dropdownState === DropdownState.initial && (
                        <>
                            <div className="flex flex-col gap-2 p-2">
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setDropdownState(
                                            DropdownState.creation
                                        );
                                    }}
                                >
                                    Create deck
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setDropdownState(DropdownState.import);
                                    }}
                                >
                                    Import deck
                                </Button>
                            </div>
                        </>
                    )}
                    {dropdownState === DropdownState.creation && (
                        <>
                            <DropdownMenuLabel className="text-muted-foreground">
                                Create deck
                            </DropdownMenuLabel>
                            <div className="flex flex-col gap-4 p-3">
                                <div className="flex flex-col gap-2">
                                    <Input
                                        id="deck-name"
                                        type="text"
                                        placeholder="Deck name"
                                        value={deckName}
                                        onChange={(e) =>
                                            setDeckName(e.target.value)
                                        }
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Input
                                        id="deck-description"
                                        type="text"
                                        placeholder="Description"
                                        value={deckDescription}
                                        onChange={(e) =>
                                            setDeckDescription(e.target.value)
                                        }
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setDropdownState(
                                                DropdownState.initial
                                            );
                                            setDeckName('');
                                            setDeckDescription('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            console.log('Create deck:', {
                                                deckName,
                                                deckDescription,
                                            });
                                        }}
                                    >
                                        Create
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                    {dropdownState === DropdownState.import && (
                        <>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    setDropdownState(DropdownState.initial);
                                }}
                                className="gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back
                            </DropdownMenuItem>
                            <DropdownMenuLabel className="text-muted-foreground">
                                Import deck
                            </DropdownMenuLabel>
                            <div className="flex flex-col gap-2 p-2">
                                <Button
                                    variant="outline"
                                    className="flex justify-start"
                                >
                                    Repeater
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex justify-start"
                                >
                                    Mochi (markdown)
                                </Button>
                                <Button
                                    variant="outline"
                                    className="relative flex justify-start"
                                    disabled
                                >
                                    Mochi (.mochi)
                                    <div className="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-md px-1 py-0.5 text-[0.5rem]">
                                        SOON
                                    </div>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="relative flex justify-start"
                                    disabled
                                >
                                    Anki
                                    <div className="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-md px-1 py-0.5 text-[0.5rem]">
                                        SOON
                                    </div>
                                </Button>
                            </div>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }
}
