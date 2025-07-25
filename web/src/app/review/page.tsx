'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

import Kbd from '@/components/Kbd';
import { useShortcutActions } from '@/components/ShortcutProvider';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { getCardsCardsGet, createReviewReviewsPost } from '@/gen';
import { usePageShortcuts } from '@/hooks/use-shortcuts';
import { createActions, getShortcut } from '@/lib/shortcuts';
import { formatDateForDisplay } from '@/lib/utils';

export default function Review() {
    usePageShortcuts('review');
    const { registerAction, unregisterAction } = useShortcutActions();
    const {
        isPending,
        isError,
        data: dueCards,
    } = useQuery({
        queryKey: ['cards', 'due'],
        queryFn: () => getCardsCardsGet({ query: { only_due: true } }),
    });

    const queryClient = useQueryClient();

    const reviewCard = useMutation({
        mutationFn: (feedback: 'ok' | 'skipped' | 'forgot') =>
            createReviewReviewsPost({
                body: {
                    card_id: activeCard!.id,
                    feedback: feedback,
                },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cards'] });
            queryClient.invalidateQueries({
                queryKey: ['reviews', activeCard!.id],
            });
        },
        // TODO: implement error handling
    });

    const [activeCardIndex, setActiveCardIndex] = useState(0);

    const activeCard = dueCards?.data?.[activeCardIndex];

    const nextCard = () => {
        if (dueCards?.data && activeCardIndex < dueCards.data.length - 1) {
            setActiveCardIndex((prev) => prev + 1);
        }
    };

    const prevCard = () => {
        if (activeCardIndex > 0) {
            setActiveCardIndex((prev) => prev - 1);
        }
    };

    useEffect(() => {
        const actions = createActions({
            'card-forgot': () => reviewCard.mutate('forgot'),
            'card-ok': () => reviewCard.mutate('ok'),
        });

        Object.entries(actions).forEach(([action, handler]) => {
            registerAction(action, handler);
        });

        return () => {
            Object.keys(actions).forEach((action) => {
                unregisterAction(action);
            });
        };
    }, [registerAction, unregisterAction, reviewCard]);

    return (
        <div className="flex h-[calc(100dvh-4rem)] w-full flex-col items-center gap-4 py-4">
            {isPending && !isError && <p>loading</p>}
            {!isPending && isError && <p>error!</p>}
            {activeCard && (
                <Card className="flex aspect-[3/4] w-4/6 max-w-sm flex-col">
                    <CardHeader className="flex flex-row items-center justify-between text-xs">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/decks">
                                        Deck
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink
                                        href={`/decks?deck_id=${activeCard.deck_id}`}
                                    >
                                        {activeCard.deck_name}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={prevCard}
                                disabled={activeCardIndex === 0}
                            >
                                <ChevronLeft />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={nextCard}
                                disabled={
                                    !dueCards?.data ||
                                    activeCardIndex >= dueCards.data.length - 1
                                }
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {activeCard.overdue && (
                            <p className="text-sm text-red-500">
                                Overdue. Review date:
                                {formatDateForDisplay(
                                    activeCard.next_review_date
                                )}
                            </p>
                        )}
                        <p className="mt-2 text-xl">{activeCard.content}</p>
                    </CardContent>
                    <CardFooter className="flex flex-row justify-center gap-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className="h-12 w-30"
                                    onClick={() => reviewCard.mutate('forgot')}
                                >
                                    Forgor
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div>
                                    {
                                        getShortcut('card-forgot', 'review')
                                            .description
                                    }
                                    <Kbd
                                        action="card-forgot"
                                        scope="review"
                                        className="ml-2"
                                    />
                                </div>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    className="h-12 w-30"
                                    onClick={() => reviewCard.mutate('ok')}
                                >
                                    I got it :)
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div>
                                    {
                                        getShortcut('card-ok', 'review')
                                            .description
                                    }
                                    <Kbd
                                        action="card-ok"
                                        scope="review"
                                        className="ml-2"
                                    />
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
