import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { Brain, UserLock, Repeat, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

import CardCreationDialog from '@/components/card-creation-dialog';
import DeckCreationDialog from '@/components/deck-creation-dialog';
import NavDecks from '@/components/nav/nav-decks';
import { NavProfile } from '@/components/nav/nav-profile';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
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
    SidebarTrigger,
} from '@/components/ui/sidebar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMe } from '@/hooks/use-me';

const pages = [
    { href: '/review', label: 'Review', icon: <Brain /> },
    { href: '/admin', label: 'Admin', roles: ['admin'], icon: <UserLock /> },
];

export function AppSidebar() {
    const queryClient = useQueryClient();
    const location = useLocation();
    const pathname = location.pathname;
    const { data: user } = useMe();
    const [cardDialogOpen, setCardDialogOpen] = useState(false);
    const [deckDialogOpen, setDeckDialogOpen] = useState(false);

    const { setOpenMobile, state, isMobile } = useSidebar();

    const visiblePages = pages.filter((page) => {
        if (!page.roles) return true;

        if (!user?.data?.role) return false;

        return page.roles.includes(user.data.role);
    });

    return (
        <Sidebar variant="floating" collapsible="icon">
            <SidebarHeader>
                <div className="flex items-center justify-between">
                    <Link
                        to="/review"
                        className="flex w-auto items-center gap-2 overflow-hidden px-2 py-1 transition-[width] duration-200 ease-linear group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:px-0"
                    >
                        <Repeat className="size-4 shrink-0" />
                        <span className="text-lg font-semibold">Repeater</span>
                    </Link>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <SidebarTrigger className="group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0" />
                        </TooltipTrigger>
                        <TooltipContent
                            side="right"
                            hidden={state !== 'collapsed' || isMobile}
                        >
                            Expand
                        </TooltipContent>
                    </Tooltip>
                </div>

                <Tooltip>
                    <DropdownMenu>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button className="w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
                                    <Plus className="size-4" />
                                    <span className="group-data-[collapsible=icon]:hidden">
                                        Create
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <DropdownMenuContent align="start">
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
                    <TooltipContent
                        side="right"
                        hidden={state !== 'collapsed' || isMobile}
                    >
                        Create
                    </TooltipContent>
                </Tooltip>

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
                                    tooltip={page.label}
                                >
                                    <Link to={page.href}>
                                        {page.icon}
                                        <span>{page.label}</span>
                                    </Link>
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
