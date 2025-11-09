import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { UserPlus, UserRoundX, User, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { ThemeChangerItems } from '@/components/theme-changer-items';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { logoutAuthLogoutPost } from '@/gen';
import { useMe } from '@/hooks/use-me';

export function NavProfile() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { data: user, isPending: userPending, isError: userError } = useMe();

    const logoutMutation = useMutation({
        mutationFn: () => logoutAuthLogoutPost(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            queryClient.invalidateQueries({ queryKey: ['decks'] });
            navigate({ to: '/login' });
        },
        onError: () => {
            toast.error('There was an error when logging out. Try again.');
        },
    });

    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                {userPending && !userError && (
                    <SidebarMenuButton size="lg">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="grid flex-1 text-left leading-tight">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="mt-1 h-3 w-24" />
                        </div>
                    </SidebarMenuButton>
                )}
                {!userPending && userError && (
                    <SidebarMenuButton size="lg">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>
                                <UserRoundX className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left leading-tight">
                            <span className="truncate font-medium">Error</span>
                            <span className="truncate text-xs">
                                Failed to load user
                            </span>
                        </div>
                    </SidebarMenuButton>
                )}
                {!userPending && !userError && user.data && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <Avatar>
                                    <AvatarFallback>
                                        {user.data.email
                                            ?.substring(0, 2)
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid leading-tight">
                                    <span className="truncate font-medium">
                                        {user.data.email?.split('@')[0] ||
                                            'Guest'}
                                    </span>
                                    <span className="truncate text-xs">
                                        {user.data.email || '-'}
                                    </span>
                                </div>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="md:w-56"
                            side={isMobile ? 'top' : 'right'}
                            align="end"
                        >
                            {user.data.role === 'guest' && (
                                <>
                                    <DropdownMenuItem asChild>
                                        <Link
                                            to="/login"
                                            onClick={() => setOpenMobile(false)}
                                        >
                                            <LogIn />
                                            Login
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link
                                            to="/register"
                                            onClick={() => setOpenMobile(false)}
                                        >
                                            <UserPlus />
                                            Register
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            )}
                            {user.data.role !== 'guest' && (
                                <>
                                    <DropdownMenuItem asChild>
                                        <Link
                                            to="/profile"
                                            onClick={() => setOpenMobile(false)}
                                        >
                                            <User />
                                            Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => logoutMutation.mutate()}
                                    >
                                        <LogOut className="text-destructive" />
                                        <span className="text-destructive">
                                            Logout
                                        </span>
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuSeparator />
                            <ThemeChangerItems />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
