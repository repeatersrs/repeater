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
import {
    Card,
    CardHeader,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
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
                    card_id: currentCard!.id,
                    feedback: feedback,
                },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['review-session'] });
            queryClient.invalidateQueries({
                queryKey: ['reviews', currentCard!.id],
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
        <div className="flex h-[calc(100dvh-4rem)] w-full flex-col items-center justify-between gap-4 pt-8 pb-4">
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
                <>
                    <div className="relative flex aspect-[3/4] w-4/6 max-w-xs">
                        {remainingCards.length > 2 && (
                            <Card className="pointer-events-none absolute inset-0 translate-x-3 translate-y-4"></Card>
                        )}
                        {remainingCards.length > 1 && (
                            <Card className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-2"></Card>
                        )}

                        <Card className="relative z-10 flex flex-1 flex-col pb-0">
                            <CardHeader className="flex flex-row items-center justify-between text-xs">
                                <DeckPathBreadcrumbs
                                    path={currentCard.deck_path}
                                    showFullPath={false}
                                />
                                {currentCard.overdue && (
                                    <p className="text-destructive/90 flex flex-row items-center gap-2">
                                        <CalendarX2 className="size-3.5" />
                                        {new Date(
                                            currentCard.next_review_date
                                        ).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="scrollbar-hidden flex-1 overflow-y-auto">
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
                                                    scope={ShortcutScope.Review}
                                                    className="ml-2"
                                                />
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
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
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        className="h-12 px-8"
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
                                        className="h-12 px-8"
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
                </>
            )}
        </div>
    );
}
