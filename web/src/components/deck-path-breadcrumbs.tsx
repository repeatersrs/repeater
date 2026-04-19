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
}

export default function DeckPathBreadcrumbs({
    path,
    showFullPath,
    showDecksRoot = false,
    highlightLast = false,
    trailingSeparator = false,
}: DeckPathBreadcrumbsProps) {
    return (
        <Breadcrumb>
            <BreadcrumbList>
                {showDecksRoot && (
                    <>
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                className="relative flex flex-row items-center gap-2 after:absolute after:-inset-2"
                                href="/decks"
                            >
                                <Folders className="size-4" />
                                <span className="sr-only">Decks</span>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                    </>
                )}
                {path.map((d, i) => {
                    const isFirst = i === 0;
                    const isLast = i === path.length - 1;
                    const shouldShow =
                        showFullPath || path.length <= 2 || isFirst || isLast;
                    const showEllipsis =
                        !showFullPath && i === 1 && path.length > 2;
                    return (
                        <React.Fragment key={d.id}>
                            {showEllipsis ? (
                                <>
                                    <BreadcrumbItem>
                                        <BreadcrumbEllipsis />
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                </>
                            ) : shouldShow ? (
                                <>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            href={`/decks/${d.id}`}
                                            className={
                                                isLast && highlightLast
                                                    ? 'text-primary'
                                                    : ''
                                            }
                                        >
                                            {d.name}
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    {(!isLast || trailingSeparator) && (
                                        <BreadcrumbSeparator />
                                    )}
                                </>
                            ) : null}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
