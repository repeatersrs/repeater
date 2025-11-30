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
}

export default function DeckPathBreadcrumbs({
    path,
    showFullPath,
}: DeckPathBreadcrumbsProps) {
    return (
        <Breadcrumb>
            <BreadcrumbList>
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
                                        <BreadcrumbLink href={`/decks/${d.id}`}>
                                            {d.name}
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    {!isLast && <BreadcrumbSeparator />}
                                </>
                            ) : null}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
