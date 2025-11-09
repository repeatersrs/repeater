import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { useState } from 'react';

import CardCreationDialog from '@/components/card-creation-dialog';
import DeckCreationDialog from '@/components/deck-creation-dialog';
import NavDecks from '@/components/nav/nav-decks';
import { NavProfile } from '@/components/nav/nav-profile';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarFooter,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from '@/components/ui/sidebar';
import { useMe } from '@/hooks/use-me';

const pages = [
    { href: '/review', label: 'Review' },
    { href: '/decks', label: 'Decks' },
    { href: '/admin', label: 'Admin', roles: ['admin'] },
];

export function AppSidebar() {
    const queryClient = useQueryClient();
    const location = useLocation();
    const pathname = location.pathname;
    const [cardDialogOpen, setCardDialogOpen] = useState(false);
    const [deckDialogOpen, setDeckDialogOpen] = useState(false);
    const { data: user } = useMe();

    const { setOpenMobile } = useSidebar();

    const visiblePages = pages.filter((page) => {
        if (!page.roles) return true;

        if (!user?.data?.role) return false;

        return page.roles.includes(user.data.role);
    });

    return (
        <Sidebar variant="floating">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="w-full">Create</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                <DropdownMenuItem
                                    onClick={() => setCardDialogOpen(true)}
                                >
                                    Create card
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setDeckDialogOpen(true)}
                                >
                                    Create deck
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <CardCreationDialog
                            open={cardDialogOpen}
                            onOpenChange={setCardDialogOpen}
                            onSuccess={() => {
                                queryClient.invalidateQueries({
                                    queryKey: ['cards'],
                                });
                                setCardDialogOpen(false);
                            }}
                        />
                        <DeckCreationDialog
                            open={deckDialogOpen}
                            onOpenChange={setDeckDialogOpen}
                            onSuccess={() => {
                                queryClient.invalidateQueries({
                                    queryKey: ['decks'],
                                });
                                setDeckDialogOpen(false);
                            }}
                        />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {visiblePages.map((page) => (
                            <SidebarMenuItem key={page.label}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={page.href === pathname}
                                    onClick={() => setOpenMobile(false)}
                                >
                                    <Link to={page.href}>{page.label}</Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
                <NavDecks />
            </SidebarContent>
            <SidebarFooter>
                <NavProfile />
            </SidebarFooter>
        </Sidebar>
    );
}
