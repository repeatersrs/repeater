import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { cn } from '@udecode/cn';
import {
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleDashed,
    Calendar,
    CalendarX2,
    ChevronsDown,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useState, useEffect } from 'react';
import Markdown from 'react-markdown';

import DeckPathBreadcrumbs from '@/components/deck-path-breadcrumbs';
import Kbd from '@/components/kbd';
import { useShortcutActions } from '@/components/shortcut-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShortcutScope } from '@/config/shortcuts';
import {
    createReviewReviewsPost,
    getReviewSessionReviewSessionGet,
} from '@/gen';
import { usePageShortcuts } from '@/hooks/use-shortcuts';
import { createActions, getShortcut } from '@/lib/shortcuts';

export const Route = createFileRoute('/review')({
    loader: async ({ context: { queryClient } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['review-session'],
            queryFn: () =>
                getReviewSessionReviewSessionGet({
                    query: {
                        exclude_paused: true,
                        exclude_archived: true,
                    },
                }),
        });
    },
    component: Review,
});

function Review() {
    usePageShortcuts(ShortcutScope.Review);
    const { registerAction, unregisterAction } = useShortcutActions();
    const shouldReduceMotion = useReducedMotion();
    const {
        isPending,
        isError,
        data: { remainingCards = [], failedCards = [], completedCards = [] } = {},
    } = useQuery({
        queryKey: ['review-session'],
        queryFn: () =>
            getReviewSessionReviewSessionGet({
                query: {
                    exclude_paused: true,
                    exclude_archived: true,
                },
            }),
        select: (response) => ({
            remainingCards: response.data?.remaining,
            failedCards: response.data?.failed,
            completedCards: response.data?.completed,
        }),
    });

    const queryClient = useQueryClient();

    const totalCards =
        remainingCards.length + failedCards.length + completedCards.length;
    const reviewedCards = completedCards.length + failedCards.length;
    const completedPercentage = (completedCards.length / totalCards) * 100;
    const failedPercentage = (failedCards.length / totalCards) * 100;

    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const [sidesVisible, setSidesVisible] = useState(1);
    const currentCard = remainingCards[activeCardIndex];
    const activeCardSides = currentCard?.content.split('---') || [];

    const reviewCard = useMutation({
        mutationFn: (feedback: 'ok' | 'skipped' | 'forgot') =>
            createReviewReviewsPost({
                body: {
                    card_id: currentCard.id,
                    feedback: feedback,
                },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['review-session'] });
            queryClient.invalidateQueries({
                queryKey: ['reviews', currentCard.id],
            });
            queryClient.invalidateQueries({
                queryKey: ['stats'],
            });
            setSidesVisible(1);
        },
    });

    const { mutate: mutateReview } = reviewCard;

    const nextCard = useCallback(() => {
        if (activeCardIndex < remainingCards.length - 1) {
            setActiveCardIndex((prev) => prev + 1);
            setSidesVisible(1);
        }
    }, [remainingCards, activeCardIndex]);

    const prevCard = useCallback(() => {
        if (activeCardIndex > 0) {
            setActiveCardIndex((prev) => prev - 1);
            setSidesVisible(1);
        }
    }, [activeCardIndex]);

    const revealNext = useCallback(() => {
        if (sidesVisible < activeCardSides.length) {
            setSidesVisible((prev) => prev + 1);
        }
    }, [activeCardSides.length, sidesVisible]);

    useEffect(() => {
        const actions = createActions({
            'card-forgot': () => mutateReview('forgot'),
            'card-ok': () => mutateReview('ok'),
            'reveal-next': revealNext,
            'card-prev': prevCard,
            'card-next': nextCard,
        });

        Object.entries(actions).forEach(([action, handler]) => {
            registerAction(action, handler);
        });

        return () => {
            Object.keys(actions).forEach((action) => {
                unregisterAction(action);
            });
        };
    }, [
        registerAction,
        unregisterAction,
        mutateReview,
        revealNext,
        prevCard,
        nextCard,
    ]);

    return (
        <div className="flex h-[calc(100dvh-4rem)] w-full flex-col items-center">
            {isPending && !isError && <p>loading</p>}
            {!isPending && isError && <p>error!</p>}
            {remainingCards.length === 0 && (
                <Alert className="bg-muted max-w-md">
                    <CircleCheck className="h-4 w-4" />
                    <AlertTitle>All done!</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                        No due cards to review.
                    </AlertDescription>
                </Alert>
            )}

            {currentCard && (
                <div className="flex flex-1 flex-col items-center justify-center px-8 pb-12 md:px-0">
                        {/* Progress */}
                        <div className="mb-5 flex w-full max-w-sm items-center gap-3">
                            <div className="bg-muted flex h-1.5 flex-1 overflow-hidden rounded-full">
                                <div
                                    className={cn(
                                        'bg-success h-full rounded-full transition-[width] duration-300 ease-out',
                                        completedCards.length === 0 && 'hidden'
                                    )}
                                    style={{
                                        width: `${completedPercentage}%`,
                                    }}
                                />
                                <div
                                    className={cn(
                                        'bg-error h-full rounded-full transition-[width] duration-300 ease-out',
                                        failedCards.length === 0 && 'hidden'
                                    )}
                                    style={{ width: `${failedPercentage}%` }}
                                />
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                {totalCards === reviewedCards ? (
                                    <CircleCheck className="size-3.5" />
                                ) : (
                                    <CircleDashed className="size-3.5" />
                                )}
                                <span className="tabular-nums">
                                    {reviewedCards} / {totalCards}
                                </span>
                            </div>
                        </div>

                        {/* Card + metadata */}
                        <div
                            key={currentCard.id}
                            className="flex w-full max-w-sm flex-col items-center"
                        >
                            {/* Card stack */}
                            <div className="relative flex aspect-[3/4] w-full">
                                {remainingCards.length > 2 && (
                                    <Card className="pointer-events-none absolute inset-0 translate-y-3 scale-[0.95] opacity-30" />
                                )}
                                {remainingCards.length > 1 && (
                                    <Card className="pointer-events-none absolute inset-0 translate-y-1.5 scale-[0.975] opacity-50" />
                                )}

                                <Card className="relative z-10 flex flex-1 flex-col pb-0">
                                    <CardContent className="scrollbar-hidden flex-1 overflow-y-auto pt-6">
                                        {activeCardSides?.map(
                                            (content, index) =>
                                                index < sidesVisible && (
                                                    <motion.div
                                                        key={`${currentCard.id}-side-${index}`}
                                                        initial={
                                                            index === 0 ||
                                                            shouldReduceMotion
                                                                ? false
                                                                : {
                                                                      opacity: 0,
                                                                      y: 6,
                                                                  }
                                                        }
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        transition={{
                                                            duration: 0.2,
                                                            ease: [
                                                                0.25, 0.46,
                                                                0.45, 0.94,
                                                            ],
                                                        }}
                                                    >
                                                        {index !== 0 && (
                                                            <Separator className="my-3" />
                                                        )}
                                                        <Markdown>
                                                            {content}
                                                        </Markdown>
                                                    </motion.div>
                                                )
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-0">
                                        {sidesVisible <
                                            activeCardSides.length && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={revealNext}
                                                        className="text-muted-foreground border-border/50 h-auto w-full rounded-none border-t border-dashed bg-transparent px-6 py-3 text-xs transition-colors hover:bg-accent/50"
                                                    >
                                                        Reveal
                                                        <ChevronsDown className="size-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div>
                                                        {
                                                            getShortcut(
                                                                'reveal-next',
                                                                ShortcutScope.Review
                                                            ).description
                                                        }
                                                        <Kbd
                                                            action="reveal-next"
                                                            scope={
                                                                ShortcutScope.Review
                                                            }
                                                            className="ml-2"
                                                        />
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </CardFooter>
                                </Card>
                            </div>

                            {/* Metadata */}
                            <div className="mt-3 flex w-full items-center justify-between text-xs">
                                <DeckPathBreadcrumbs
                                    path={currentCard.deck_path}
                                    showFullPath={false}
                                />
                                <p
                                    className={`flex flex-row items-center gap-1.5 ${currentCard.overdue ? 'text-destructive/90' : 'text-muted-foreground'}`}
                                >
                                    {new Date(
                                        currentCard.next_review_date
                                    ).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                    {currentCard.overdue ? (
                                        <CalendarX2 className="size-3.5" />
                                    ) : (
                                        <Calendar className="size-3.5" />
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mt-8 flex items-center gap-3">
                            <div className="flex gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={prevCard}
                                            disabled={activeCardIndex === 0}
                                            className="h-9 w-9"
                                        >
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div>
                                            {
                                                getShortcut(
                                                    'card-prev',
                                                    ShortcutScope.Review
                                                ).description
                                            }
                                            <Kbd
                                                action="card-prev"
                                                scope={ShortcutScope.Review}
                                                className="ml-2"
                                            />
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={nextCard}
                                            disabled={
                                                activeCardIndex >=
                                                remainingCards.length - 1
                                            }
                                            className="h-9 w-9"
                                        >
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div>
                                            {
                                                getShortcut(
                                                    'card-next',
                                                    ShortcutScope.Review
                                                ).description
                                            }
                                            <Kbd
                                                action="card-next"
                                                scope={ShortcutScope.Review}
                                                className="ml-2"
                                            />
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Separator
                                orientation="vertical"
                                className="!h-6"
                            />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-12 min-w-28 border-error/20 text-error/90 transition-colors hover:border-error/30 hover:bg-error/5 hover:text-error active:scale-[0.97]"
                                        onClick={() =>
                                            reviewCard.mutate('forgot')
                                        }
                                    >
                                        Forgot
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div>
                                        {
                                            getShortcut(
                                                'card-forgot',
                                                ShortcutScope.Review
                                            ).description
                                        }
                                        <Kbd
                                            action="card-forgot"
                                            scope={ShortcutScope.Review}
                                            className="ml-2"
                                        />
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-12 min-w-28 border-success/25 bg-success/5 text-success transition-colors hover:border-success/35 hover:bg-success/10 active:scale-[0.97]"
                                        onClick={() => reviewCard.mutate('ok')}
                                    >
                                        Remembered
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div>
                                        {
                                            getShortcut(
                                                'card-ok',
                                                ShortcutScope.Review
                                            ).description
                                        }
                                        <Kbd
                                            action="card-ok"
                                            scope={ShortcutScope.Review}
                                            className="ml-2"
                                        />
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
            )}
        </div>
    );
}
