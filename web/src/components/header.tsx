import { ReactNode } from 'react';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

interface HeaderProps {
    children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
    const { isMobile, openMobile } = useSidebar();

    return (
        <header className="relative mx-4 flex h-12 items-center justify-center border-b">
            {isMobile && !openMobile && (
                <div className="absolute left-0">
                    <SidebarTrigger />
                </div>
            )}
            {children}
        </header>
    );
}
