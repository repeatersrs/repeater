import { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { AppProviders } from '@/components/app-providers';
import { AppSidebar } from '@/components/nav/app-sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

interface RouterContext {
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: RootComponent,
});

function RootComponent() {
    return (
        <AppProviders>
            <AppSidebar />
            <SidebarInset>
                <header className="pt-6 pl-6 md:p-4">
                    <SidebarTrigger />
                </header>
                <Outlet />
            </SidebarInset>
            <Toaster />
            {import.meta.env.MODE === 'development' ? (
                <TanStackRouterDevtools position="bottom-right" />
            ) : null}
        </AppProviders>
    );
}
