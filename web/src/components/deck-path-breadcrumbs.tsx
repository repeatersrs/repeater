import { Folders } from 'lucide-react';
import React from 'react';

import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface DeckPathBreadcrumbsProps {
    path: Array<{
        [key: string]: string;
    }>;
    showFullPath: boolean;
    showDecksRoot?: boolean;
    highlightLast?: boolean;
    /** Render a chevron after the last crumb so another element (e.g. an
     * editable title) can act as the final segment. */
    trailingSeparator?: boolean;
    /** Replace the path with a single ellipsis — for rows too narrow to
     * fit the real crumbs inline. */
    collapsed?: boolean;
}

export default function DeckPathBreadcrumbs({
    path,
    showFullPath,
    showDecksRoot = false,
    highlightLast = false,
    trailingSeparator = false,
    collapsed = false,
}: DeckPathBreadcrumbsProps) {
    const items: React.ReactNode[] = [];

    if (showDecksRoot) {
        items.push(
            <BreadcrumbItem key="root">
                <BreadcrumbLink
                    className="relative flex flex-row items-center gap-2 after:absolute after:-inset-2"
                    href="/decks"
                >
                    <Folders className="size-4" />
                    <span className="sr-only">Decks</span>
                </BreadcrumbLink>
            </BreadcrumbItem>
        );
    }

    if (collapsed) {
        items.push(
            <BreadcrumbItem key="collapsed">
                <BreadcrumbEllipsis />
            </BreadcrumbItem>
        );
    } else {
        path.forEach((d, i) => {
            const isFirst = i === 0;
            const isLast = i === path.length - 1;
            const shouldShow =
                showFullPath || path.length <= 2 || isFirst || isLast;
            const showEllipsis = !showFullPath && i === 1 && path.length > 2;

            if (showEllipsis) {
                items.push(
                    <BreadcrumbItem key={`ellipsis-${d.id}`}>
                        <BreadcrumbEllipsis />
                    </BreadcrumbItem>
                );
            } else if (shouldShow) {
                items.push(
                    <BreadcrumbItem key={d.id} className="min-w-0">
                        <BreadcrumbLink
                            href={`/decks/${d.id}`}
                            className={cn(
                                'block max-w-[7rem] truncate',
                                isLast && highlightLast && 'text-primary'
                            )}
                        >
                            {d.name}
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                );
            }
        });
    }

    return (
        <Breadcrumb>
            <BreadcrumbList className="flex-nowrap overflow-hidden">
                {items.map((item, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <BreadcrumbSeparator />}
                        {item}
                    </React.Fragment>
                ))}
                {trailingSeparator && items.length > 0 && (
                    <BreadcrumbSeparator />
                )}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
