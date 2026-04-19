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
                'bg-sidebar border-sidebar-border sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b px-4 py-3 md:hidden',
                className
            )}
        >
            <SidebarTrigger className="-ml-2" />
            {children && <div className="min-w-0 flex-1">{children}</div>}
        </div>
    );
}
