import { cn } from '@udecode/cn';

import { SidebarTrigger } from '@/components/ui/sidebar';

/**
 * Mobile-only top strip with the sidebar trigger and optional context
 * (title, breadcrumbs, etc.). Desktop hides it — the floating sidebar
 * stays visible, so there's nothing to toggle.
 */
export default function MobileAppBar({
    children,
    className,
}: {
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'bg-sidebar border-sidebar-border sticky top-0 z-10 flex h-12 shrink-0 items-center justify-center border-b md:hidden',
                className
            )}
        >
            <SidebarTrigger className="absolute left-2" />
            {children && (
                <div className="min-w-0 truncate px-12">{children}</div>
            )}
        </div>
    );
}
