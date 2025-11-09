import { ShortcutProvider } from '@/components/shortcut-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import '@/lib/api-client';

export function AppProviders({
    children,
    ...props
}: React.ComponentProps<typeof ThemeProvider>) {
    return (
        <ThemeProvider {...props}>
            <SidebarProvider>
                <ShortcutProvider>{children}</ShortcutProvider>
            </SidebarProvider>
        </ThemeProvider>
    );
}
