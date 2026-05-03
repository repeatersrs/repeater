import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    CalendarX2,
    CircleCheck,
    Folder,
    Plus,
    Redo2,
    Undo2,
} from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import Markdown from 'react-markdown';

import { DotField } from '@/components/dot-field';
import Kbd from '@/components/kbd';
import { useShortcutActions } from '@/components/shortcut-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShortcutScope } from '@/config/shortcuts';
import {
    createReviewReviewsPost,
    getReviewSessionReviewSessionGet,
    redoReviewSessionReviewSessionRedoPost,
    undoReviewSessionReviewSessionUndoPost,
} from '@/gen';
import type { ReviewSessionOut } from '@/gen';
import { usePageShortcuts } from '@/hooks/use-shortcuts';
import { createActions, getShortcut } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';

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

type ReviewFeedback = 'ok' | 'skipped' | 'forgot';
type ReviewSessionQueryData = { data?: ReviewSessionOut };

function Review() {
    usePageShortcuts(ShortcutScope.Review);
    const { registerAction, unregisterAction } = useShortcutActions();
    const {
        isPending,
        isError,
        data: {
            remainingCards = [],
            failedCards = [],
            completedCards = [],
            canUndoSession = false,
            canRedoSession = false,
        } = {},
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
            canUndoSession: response.data?.can_undo,
            canRedoSession: response.data?.can_redo,
        }),
    });

    const queryClient = useQueryClient();

    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const [sidesVisible, setSidesVisible] = useState(1);
    const currentCard = remainingCards[activeCardIndex];
    const activeCardSides = currentCard?.content.split('---') || [];

    const totalCards =
        remainingCards.length + failedCards.length + completedCards.length;
    const reviewedCards = completedCards.length + failedCards.length;
    const completedPercentage = totalCards
        ? (completedCards.length / totalCards) * 100
        : 0;
    const failedPercentage = totalCards
        ? (failedCards.length / totalCards) * 100
        : 0;

    const reviewCard = useMutation({
        mutationFn: ({
            cardId,
            feedback,
        }: {
            cardId: string;
            feedback: ReviewFeedback;
        }) =>
            createReviewReviewsPost({
                body: {
                    card_id: cardId,
                    feedback: feedback,
                },
            }),
        onMutate: async ({ cardId, feedback }) => {
            await queryClient.cancelQueries({ queryKey: ['review-session'] });

            const previousSession =
                queryClient.getQueryData<ReviewSessionQueryData>([
                    'review-session',
                ]);

            queryClient.setQueryData<ReviewSessionQueryData>(
                ['review-session'],
                (old) => {
                    const session = old?.data;
                    const reviewedCard = session?.remaining.find(
                        (card) => card.id === cardId
                    );

                    if (!old || !session || !reviewedCard) {
                        return old;
                    }

                    return {
                        ...old,
                        data: {
                            ...session,
                            remaining: session.remaining.filter(
                                (card) => card.id !== cardId
                            ),
                            completed:
                                feedback === 'ok'
                                    ? [...session.completed, reviewedCard]
                                    : session.completed,
                            failed:
                                feedback === 'forgot'
                                    ? [...session.failed, reviewedCard]
                                    : session.failed,
                        },
                    };
                }
            );

            setActiveCardIndex((index) =>
                index >= remainingCards.length - 1
                    ? Math.max(index - 1, 0)
                    : index
            );
            setSidesVisible(1);

            return { previousSession };
        },
        onError: (_error, _variables, context) => {
            if (context?.previousSession) {
                queryClient.setQueryData(
                    ['review-session'],
                    context.previousSession
                );
            }
        },
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({ queryKey: ['review-session'] });
            queryClient.invalidateQueries({
                queryKey: ['reviews', variables?.cardId],
            });
            queryClient.invalidateQueries({
                queryKey: ['stats'],
            });
        },
        // TODO: implement error handling
    });

    const updateReviewSession = useCallback(
        (response: ReviewSessionQueryData) => {
            queryClient.setQueryData(['review-session'], response);
            setActiveCardIndex(0);
            setSidesVisible(1);
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
        [queryClient]
    );

    const undoReview = useMutation({
        mutationFn: () =>
            undoReviewSessionReviewSessionUndoPost({
                query: {
                    exclude_paused: true,
                    exclude_archived: true,
                },
            }),
        onSuccess: updateReviewSession,
    });

    const redoReview = useMutation({
        mutationFn: () =>
            redoReviewSessionReviewSessionRedoPost({
                query: {
                    exclude_paused: true,
                    exclude_archived: true,
                },
            }),
        onSuccess: updateReviewSession,
    });

    const mutateReview = useCallback(
        (feedback: ReviewFeedback) => {
            if (currentCard && !reviewCard.isPending) {
                reviewCard.mutate({ cardId: currentCard.id, feedback });
            }
        },
        [currentCard, reviewCard]
    );

    const undoLastReview = useCallback(() => {
        if (
            canUndoSession &&
            !reviewCard.isPending &&
            !undoReview.isPending &&
            !redoReview.isPending
        ) {
            undoReview.mutate();
        }
    }, [
        canUndoSession,
        redoReview.isPending,
        reviewCard.isPending,
        undoReview,
    ]);

    const redoLastReview = useCallback(() => {
        if (
            canRedoSession &&
            !reviewCard.isPending &&
            !undoReview.isPending &&
            !redoReview.isPending
        ) {
            redoReview.mutate();
        }
    }, [
        canRedoSession,
        redoReview,
        reviewCard.isPending,
        undoReview.isPending,
    ]);

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
            return;
        }

        mutateReview('ok');
    }, [activeCardSides.length, mutateReview, sidesVisible]);

    useEffect(() => {
        const actions = createActions({
            'card-forgot': () => mutateReview('forgot'),
            'card-ok': () => mutateReview('ok'),
            'reveal-next': revealNext,
            'review-undo': undoLastReview,
            'review-redo': redoLastReview,
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
        undoLastReview,
        redoLastReview,
        prevCard,
        nextCard,
    ]);

    const currentDeck =
        currentCard?.deck_path?.[currentCard.deck_path.length - 1];
    const deckName = currentDeck?.name ?? '';
    const deckId = currentDeck?.id;
    const reviewDate = currentCard?.due_date
        ? new Date(currentCard.due_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
          })
        : null;
    const isOverdue = !!currentCard?.overdue;

    const hasMoreSides = sidesVisible < activeCardSides.length;
    const canGoPrev = activeCardIndex > 0;
    const canGoNext = activeCardIndex < remainingCards.length - 1;
    const canUndo =
        canUndoSession && !reviewCard.isPending && !undoReview.isPending;
    const canRedo =
        canRedoSession && !reviewCard.isPending && !redoReview.isPending;
    const canRevealShortcut = getShortcut('reveal-next', ShortcutScope.Review);
    const undoTooltip = canUndo ? 'Undo last review' : 'Nothing to undo yet';
    const previousTooltip = canGoPrev
        ? 'Previous card'
        : 'You’re already on the first card';
    const nextTooltip = canGoNext
        ? 'Next card'
        : 'You’re already on the last card';
    const redoTooltip = canRedo ? 'Redo review' : 'Nothing to redo right now';

    return (
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-sm">
            {/* Fixed so the dots continue underneath the floating sidebar. */}
            <DotField
                spacing={14}
                radius={1}
                className="text-destructive/12 fixed"
            />

            {isPending && !isError && (
                <p className="text-muted-foreground m-auto">loading</p>
            )}
            {!isPending && isError && (
                <p className="text-destructive m-auto">error!</p>
            )}

            {!isPending && remainingCards.length === 0 && (
                <div className="m-auto">
                    <Alert className="bg-card max-w-md">
                        <CircleCheck className="h-4 w-4" />
                        <AlertTitle>All done!</AlertTitle>
                        <AlertDescription className="text-muted-foreground">
                            No due cards to review.
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {currentCard && (
                <>
                    {/* Progress header */}
                    <div className="relative z-10 shrink-0 p-3 pb-0 md:p-2 md:pl-0">
                        <div className="bg-sidebar border-sidebar-border flex flex-col overflow-hidden border">
                            <div className="flex items-end justify-between gap-4 px-4 pt-[14px] pb-[12px] md:gap-8 md:px-6 md:pt-[18px] md:pb-[14px]">
                                <div className="flex flex-col gap-1.5 md:gap-2">
                                    <span className="text-muted-foreground text-[10px] leading-[14px] font-medium tracking-[0.08em] uppercase">
                                        Done
                                    </span>
                                    <div className="flex items-baseline gap-2.5 tabular-nums md:gap-3">
                                        <span className="text-foreground text-[32px] leading-none font-extrabold tracking-[-0.02em] md:text-[36px]">
                                            {reviewedCards}
                                        </span>
                                        {reviewedCards > 0 && (
                                            <div className="flex items-center gap-2 text-xs font-medium tabular-nums">
                                                <span className="text-success">
                                                    {completedCards.length} ok
                                                </span>
                                                <span
                                                    aria-hidden
                                                    className="text-muted-foreground/40"
                                                >
                                                    ·
                                                </span>
                                                <span className="text-destructive">
                                                    {failedCards.length} forgot
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 md:gap-2">
                                    <span className="text-muted-foreground/70 text-[10px] leading-[14px] font-medium tracking-[0.08em] uppercase">
                                        To go
                                    </span>
                                    <span className="text-muted-foreground text-[32px] leading-none font-extrabold tracking-[-0.02em] tabular-nums md:text-[36px]">
                                        {remainingCards.length}
                                    </span>
                                </div>
                            </div>

                            <div className="flex h-[6px] w-full gap-[2px]">
                                {completedCards.length > 0 && (
                                    <div
                                        className="bg-success h-full"
                                        style={{
                                            width: `${completedPercentage}%`,
                                        }}
                                    />
                                )}
                                {failedCards.length > 0 && (
                                    <div
                                        className="bg-destructive h-full"
                                        style={{
                                            width: `${failedPercentage}%`,
                                        }}
                                    />
                                )}
                                <div className="bg-muted h-full flex-1" />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-6 md:gap-3.5 md:px-8">
                        <div className="relative w-full max-w-[380px]">
                            {remainingCards.length > 2 && (
                                <div
                                    aria-hidden
                                    className="bg-card border-border pointer-events-none absolute inset-0 translate-x-[4px] translate-y-[5px] rounded-sm border"
                                />
                            )}
                            {remainingCards.length > 1 && (
                                <div
                                    aria-hidden
                                    className="bg-card border-border pointer-events-none absolute inset-0 translate-x-[2px] translate-y-[2.5px] rounded-sm border"
                                />
                            )}

                            <div className="bg-card border-border relative flex flex-col overflow-hidden rounded-sm border">
                                <div className="scrollbar-hidden max-h-[60dvh] overflow-y-auto">
                                    {activeCardSides?.map(
                                        (content, index) =>
                                            index < sidesVisible && (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        'flex min-h-[6.5rem] flex-col px-6 py-5 text-xl leading-snug',
                                                        index !== 0 &&
                                                            'border-border border-t'
                                                    )}
                                                >
                                                    <Markdown>
                                                        {content}
                                                    </Markdown>
                                                </div>
                                            )
                                    )}
                                </div>

                                {hasMoreSides && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={revealNext}
                                                className="border-border text-muted-foreground hover:bg-accent flex items-center justify-center gap-1.5 border-t py-2.5 text-xs transition-colors"
                                            >
                                                Reveal
                                                <Plus className="size-3 opacity-60" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div>
                                                {canRevealShortcut.description}
                                                <Kbd
                                                    action="reveal-next"
                                                    scope={ShortcutScope.Review}
                                                    className="ml-2"
                                                />
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        <div className="text-muted-foreground flex w-full max-w-[380px] items-center justify-between gap-4 text-xs">
                            {deckId && (
                                <Link
                                    to="/decks/$deckId"
                                    params={{ deckId }}
                                    className="hover:text-foreground flex min-w-0 items-center gap-1.5 transition-colors"
                                >
                                    <Folder className="size-3.5 shrink-0" />
                                    <span className="truncate">{deckName}</span>
                                </Link>
                            )}
                            {reviewDate && (
                                <span
                                    className={cn(
                                        'flex shrink-0 items-center gap-1.5 tabular-nums',
                                        isOverdue
                                            ? 'text-destructive'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {reviewDate}
                                    {isOverdue ? (
                                        <CalendarX2 className="size-3.5" />
                                    ) : (
                                        <Calendar className="size-3.5" />
                                    )}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 flex shrink-0 flex-col gap-2.5 px-4 pt-3 pb-5 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-3 md:px-0 md:py-6">
                        <div className="order-1 grid grid-cols-4 gap-2.5 md:order-none md:flex md:justify-end md:gap-3">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-full md:size-11"
                                            onClick={undoLastReview}
                                            disabled={!canUndo}
                                            aria-label="Undo last review"
                                        >
                                            <Undo2 className="size-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {undoTooltip}
                                    {canUndo && (
                                        <Kbd
                                            action="review-undo"
                                            scope={ShortcutScope.Review}
                                            className="ml-2"
                                        />
                                    )}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-full md:size-11"
                                            onClick={prevCard}
                                            disabled={!canGoPrev}
                                            aria-label="Previous card"
                                        >
                                            <ArrowLeft className="size-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {previousTooltip}
                                    {canGoPrev && (
                                        <Kbd
                                            action="card-prev"
                                            scope={ShortcutScope.Review}
                                            className="ml-2"
                                        />
                                    )}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex md:hidden">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-full"
                                            onClick={nextCard}
                                            disabled={!canGoNext}
                                            aria-label="Next card"
                                        >
                                            <ArrowRight className="size-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {nextTooltip}
                                    {canGoNext && (
                                        <Kbd
                                            action="card-next"
                                            scope={ShortcutScope.Review}
                                            className="ml-2"
                                        />
                                    )}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex md:hidden">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-full"
                                            onClick={redoLastReview}
                                            disabled={!canRedo}
                                            aria-label="Redo review"
                                        >
                                            <Redo2 className="size-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {redoTooltip}
                                    {canRedo && (
                                        <Kbd
                                            action="review-redo"
                                            scope={ShortcutScope.Review}
                                            className="ml-2"
                                        />
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="order-2 flex min-w-0 justify-center gap-2.5 md:order-none md:gap-3">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        className="border-border h-12 min-w-0 flex-1 border px-5 md:h-11 md:w-32 md:flex-none md:px-8"
                                        onClick={() => mutateReview('forgot')}
                                        disabled={reviewCard.isPending}
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
                                        className="h-12 min-w-0 flex-1 px-5 md:h-11 md:w-32 md:flex-none md:px-8"
                                        onClick={() => mutateReview('ok')}
                                        disabled={reviewCard.isPending}
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

                        <div className="order-3 hidden justify-start gap-2.5 md:order-none md:flex md:gap-3">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="size-11"
                                            onClick={nextCard}
                                            disabled={!canGoNext}
                                            aria-label="Next card"
                                        >
                                            <ArrowRight className="size-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {nextTooltip}
                                    {canGoNext && (
                                        <Kbd
                                            action="card-next"
                                            scope={ShortcutScope.Review}
                                            className="ml-2"
                                        />
                                    )}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="size-11"
                                            onClick={redoLastReview}
                                            disabled={!canRedo}
                                            aria-label="Redo review"
                                        >
                                            <Redo2 className="size-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {redoTooltip}
                                    {canRedo && (
                                        <Kbd
                                            action="review-redo"
                                            scope={ShortcutScope.Review}
                                            className="ml-2"
                                        />
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
