import { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import { AppSidebar } from '@/components/nav/app-sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

import { AppProviders } from '../app/providers';

interface RouterContext {
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: RootComponent,
});

function RootComponent() {
    return (
        <AppProviders
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="vite-ui-theme"
        >
            <AppSidebar />
            <SidebarInset>
                <header className="pl-6 pt-6 md:p-4">
                    <SidebarTrigger />
                </header>
                <Outlet />
            </SidebarInset>
            <Toaster />
            <TanStackRouterDevtools position="bottom-right" />
        </AppProviders>
    );
}
