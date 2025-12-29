import { cn } from '@udecode/cn';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

export default function Header({ className }: React.ComponentProps<'div'>) {
    const { isMobile, openMobile } = useSidebar();

    return (
        <header
            className={cn(
                className,
                'relative mx-4 flex h-12 items-center justify-center border-b'
            )}
        >
            {isMobile && !openMobile && (
                <div className="absolute left-0">
                    <SidebarTrigger />
                </div>
            )}
        </header>
    );
}
