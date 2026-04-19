import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
    CalendarX2,
    CircleCheck,
    Folder,
    Plus,
    Repeat,
} from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import Markdown from 'react-markdown';

import { DotField } from '@/components/dot-field';
import Kbd from '@/components/kbd';
import { useShortcutActions } from '@/components/shortcut-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
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
import { cn } from '@/lib/utils';
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
        data: {
            remainingCards = [],
            failedCards = [],
            completedCards = [],
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

    const currentDeck =
        currentCard?.deck_path?.[currentCard.deck_path.length - 1];
    const deckName = currentDeck?.name ?? '';
    const deckId = currentDeck?.id;
    const overdueDate = currentCard?.overdue
        ? new Date(currentCard.next_review_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
          })
        : null;

    const hasMoreSides = sidesVisible < activeCardSides.length;
    const canRevealShortcut = getShortcut('reveal-next', ShortcutScope.Review);

    return (
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-sm">
            {/* Programmatic dot field — individual SVG circles so future
                effects (ripple on click, cursor proximity, etc.) can target
                each dot as its own DOM element. Fixed to the viewport so
                the pattern continues underneath the floating sidebar. */}
            <DotField
                spacing={14}
                radius={1}
                className="fixed text-destructive/12"
            />

            {/* Mobile app bar — brand on the left, sidebar trigger on the
                right. Hidden on md+, where the floating sidebar is visible. */}
            <div className="bg-sidebar border-sidebar-border relative z-10 flex shrink-0 items-center justify-between border-b px-4 py-3 md:hidden">
                <Link
                    to="/review"
                    className="flex items-center gap-2 text-base font-semibold"
                >
                    <Repeat className="size-4" />
                    <span>Repeater</span>
                </Link>
                <SidebarTrigger className="-mr-2" />
            </div>

            {isPending && !isError && (
                <p className="m-auto text-muted-foreground">loading</p>
            )}
            {!isPending && isError && (
                <p className="m-auto text-destructive">error!</p>
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
                    {/* Progress header — "Stats macro · with bg" panel.
                        Floating panel with sidebar tokens (#FAFAFA bg /
                        #EBEBEB border), DONE + breakdown on the left,
                        TO GO number on the right, segmented bar flush at the
                        bottom via overflow-clip. See Paper node 4Z9-0
                        (desktop) and 524-0 (mobile). */}
                    <div className="relative z-10 shrink-0 p-3 pb-0 md:p-2">
                        <div className="bg-sidebar border-sidebar-border flex flex-col overflow-hidden border">
                            <div className="flex items-end justify-between gap-4 px-4 pt-[14px] pb-[12px] md:gap-8 md:px-6 md:pt-[18px] md:pb-[14px]">
                                {/* Done */}
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

                                {/* To go */}
                                <div className="flex flex-col items-end gap-1.5 md:gap-2">
                                    <span className="text-muted-foreground/70 text-[10px] leading-[14px] font-medium tracking-[0.08em] uppercase">
                                        To go
                                    </span>
                                    <span className="text-muted-foreground text-[32px] leading-none font-extrabold tracking-[-0.02em] tabular-nums md:text-[36px]">
                                        {remainingCards.length}
                                    </span>
                                </div>
                            </div>

                            {/* Segmented bar flush at the bottom of the panel */}
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

                    {/* Card + caption */}
                    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-6 md:gap-3.5 md:px-8">
                        <div className="relative w-full max-w-[380px]">
                            {/* Ghost stack — disabled for now, keep for future use.
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
                            */}

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
                            {deckId ? (
                                <Link
                                    to="/decks/$deckId"
                                    params={{ deckId }}
                                    className="hover:text-foreground flex min-w-0 items-center gap-1.5 transition-colors"
                                >
                                    <Folder className="size-3.5 shrink-0" />
                                    <span className="truncate">
                                        {deckName}
                                    </span>
                                </Link>
                            ) : (
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <Folder className="size-3.5 shrink-0" />
                                    <span className="truncate">
                                        {deckName}
                                    </span>
                                </span>
                            )}
                            {overdueDate && (
                                <span className="text-destructive flex shrink-0 items-center gap-1.5 tabular-nums">
                                    <CalendarX2 className="size-3.5" />
                                    {overdueDate}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Controls — stretch edge-to-edge on mobile (flex-1
                        buttons), sit at fixed widths and centered on md+. */}
                    <div className="relative z-10 flex shrink-0 items-center gap-2.5 px-4 pt-3 pb-5 md:justify-center md:gap-3 md:px-0 md:py-6">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className="border-border h-12 flex-1 border md:h-11 md:flex-none md:px-8"
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
                                    className="h-12 flex-1 md:h-11 md:flex-none md:px-8"
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
                </>
            )}
        </div>
    );
}
