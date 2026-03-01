import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CalendarX2,
    ArrowBigDownDash,
} from 'lucide-react';
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
    const {
        isPending,
        isError,
        data: { remainingCards = [] } = {},
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
        // TODO: implement error handling
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
        <div className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center overflow-y-auto p-4 md:p-6">
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
                <div className="flex w-full max-w-5xl flex-col rounded-2xl border bg-card/60 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-xs md:px-6">
                        <DeckPathBreadcrumbs
                            path={currentCard.deck_path}
                            showFullPath={false}
                        />
                        <div className="text-muted-foreground flex items-center gap-2">
                            <span>
                                Card {activeCardIndex + 1} of{' '}
                                {remainingCards.length}
                            </span>
                            {currentCard.overdue && (
                                <span className="text-destructive inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5">
                                    <CalendarX2 className="size-3" />
                                    Overdue ·{' '}
                                    {new Date(
                                        currentCard.next_review_date
                                    ).toLocaleDateString('en-US', {
                                        month: '2-digit',
                                        day: '2-digit',
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col p-4 md:p-6">
                        <div className="mx-auto flex w-full max-w-xl">
                            <Card className="flex w-full flex-col border-2 shadow-md shadow-black/5">
                                <CardContent className="scrollbar-hidden max-h-[min(60dvh,34rem)] flex-1 overflow-y-auto pt-6">
                                    {activeCardSides?.map(
                                        (content, index) =>
                                            index < sidesVisible && (
                                                <div key={index}>
                                                    {index !== 0 && (
                                                        <Separator className="my-2" />
                                                    )}
                                                    <Markdown>{content}</Markdown>
                                                </div>
                                            )
                                    )}

                                    <div className="from-card pointer-events-none sticky right-0 bottom-0 left-0 h-16 bg-gradient-to-t to-transparent"></div>
                                </CardContent>
                                <CardFooter className="p-0">
                                    {sidesVisible < activeCardSides.length && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    onClick={revealNext}
                                                    className="hover:from-accent/25 hover:to-card text-muted-foreground h-10 w-full bg-transparent p-6 text-xs transition-none hover:bg-transparent hover:bg-gradient-to-t hover:transition-all"
                                                >
                                                    Next side
                                                    <ArrowBigDownDash />
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

                        <Separator className="my-4 md:my-6" />

                        <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
                            <div className="flex justify-center gap-2 md:justify-start">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={prevCard}
                                            disabled={activeCardIndex === 0}
                                        >
                                            <ChevronLeft />
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
                                            variant="outline"
                                            size="icon"
                                            onClick={nextCard}
                                            disabled={
                                                activeCardIndex >=
                                                remainingCards.length - 1
                                            }
                                        >
                                            <ChevronRight />
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

                            <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="secondary"
                                            className="h-12 px-6 md:px-8"
                                            onClick={() => mutateReview('forgot')}
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
                                            className="h-12 px-6 md:px-8"
                                            onClick={() => mutateReview('ok')}
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
                    </div>
                </div>
            )}
        </div>
    );
}
