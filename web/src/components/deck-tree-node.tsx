'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import DeckCreationDialog from '@/components/deck-creation-dialog';
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from '@/components/ui/collapsible';
import {
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuAction,
} from '@/components/ui/sidebar';
import { DeckNode } from '@/gen';

function DeckTreeNodeContent({ deck }: { deck: DeckNode }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = deck.children.length > 0;

    function handleDeckClick(_: React.MouseEvent) {
        router.push(`/decks/${deck.id}`);
    }

    if (hasChildren) {
        return (
            <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="group/collapsible"
            >
                <SidebarMenuButton className="cursor-pointer">
                    <span className="flex-1" onClick={handleDeckClick}>
                        {deck.name}
                    </span>
                    <CollapsibleTrigger asChild>
                        <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                </SidebarMenuButton>

                <SidebarMenuAction
                    title="Create deck"
                    className="ml-1 cursor-pointer"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <Plus />
                    <span className="sr-only">Create deck</span>
                </SidebarMenuAction>

                <CollapsibleContent>
                    <SidebarMenuSub>
                        {deck.children.map((child) => (
                            <SidebarMenuSubItem key={child.id}>
                                <DeckTreeNodeContent deck={child} />
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>

                <DeckCreationDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSuccess={() =>
                        queryClient.invalidateQueries({
                            queryKey: ['decks'],
                        })
                    }
                    defaultParentId={deck.id}
                />
            </Collapsible>
        );
    }

    // leaf nodes
    return (
        <>
            <div className="flex items-center">
                <SidebarMenuButton
                    className="flex-1 cursor-pointer"
                    onClick={handleDeckClick}
                >
                    {deck.name}
                </SidebarMenuButton>
                <SidebarMenuAction
                    title="Create deck"
                    className="ml-1 cursor-pointer"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <Plus />
                    <span className="sr-only">Create deck</span>
                </SidebarMenuAction>
            </div>
            <DeckCreationDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={() =>
                    queryClient.invalidateQueries({
                        queryKey: ['decks'],
                    })
                }
                defaultParentId={deck.id}
            />
        </>
    );
}

export default function DeckTreeNode({ deck }: { deck: DeckNode }) {
    return (
        <SidebarMenuItem>
            <DeckTreeNodeContent deck={deck} />
        </SidebarMenuItem>
    );
}
