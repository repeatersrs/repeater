import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import Markdown from 'react-markdown';

import Kbd from '@/components/kbd';
import { PracticeModeAlert } from '@/components/practice-mode-alert';
import { useShortcutActions } from '@/components/shortcut-provider';
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
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShortcutScope } from '@/config/shortcuts';
import {
    getCardsCardsGet,
    createReviewReviewsPost,
    getRandomCardsCardsRandomGet,
    CardOut,
} from '@/gen';
import { usePageShortcuts } from '@/hooks/use-shortcuts';
import { createActions, getShortcut } from '@/lib/shortcuts';
import { daysSince } from '@/lib/utils';

export const Route = createFileRoute('/review')({
    loader: async ({ context: { queryClient } }) => {
        const dueCards = await queryClient.ensureQueryData({
            queryKey: ['cards', 'due'],
            queryFn: () =>
                getCardsCardsGet({
                    query: {
                        only_due: true,
                        exclude_paused: true,
                        exclude_archived: true,
                    },
                }),
        });
        return { dueCards };
    },
    component: Review,
});

function Review() {
    usePageShortcuts(ShortcutScope.Review);
    const [practiceMode, setPracticeMode] = useState(false);
    const [practiceDeckId, setPracticeDeckId] = useState<string | undefined>();
    const [practiceCardCount, setPracticeCardCount] = useState(10);
    const { registerAction, unregisterAction } = useShortcutActions();
    const {
        isPending,
        isError,
        data: dueCards,
        refetch: refetchCards,
    } = useQuery({
        queryKey: [
            'cards',
            'due',
            practiceMode,
            practiceDeckId,
            practiceCardCount,
        ],
        queryFn: () =>
            !practiceMode
                ? getCardsCardsGet({
                      query: {
                          only_due: true,
                          exclude_paused: true,
                          exclude_archived: true,
                      },
                  })
                : getRandomCardsCardsRandomGet({
                      query: {
                          count: practiceCardCount,
                          exclude_paused: true,
                          exclude_archived: true,
                          ...(practiceDeckId && {
                              deck_ids: practiceDeckId,
                          }),
                      },
                  }),
    });

    const queryClient = useQueryClient();

    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const [sidesVisible, setSidesVisible] = useState(1);
    const activeCard = dueCards?.data?.[activeCardIndex];
    const activeCardSides = activeCard?.content.split('---') || [];

    const reviewCard = useMutation({
        mutationFn: (feedback: 'ok' | 'skipped' | 'forgot') =>
            createReviewReviewsPost({
                body: {
                    card_id: activeCard!.id,
                    feedback: feedback,
                },
            }),
        onSuccess: () => {
            removeCardAtIndex(activeCardIndex);
            queryClient.invalidateQueries({
                queryKey: ['reviews', activeCard!.id],
            });
            queryClient.invalidateQueries({
                queryKey: ['stats'],
            });
            setSidesVisible(1);
        },
    });

    useEffect(() => {
        if (practiceMode) {
            refetchCards();
        }
    }, [practiceMode, refetchCards]);

    const startPracticeMode = async (options: {
        deckId?: string;
        count: number;
    }) => {
        setPracticeMode(true);
        setPracticeDeckId(options.deckId);
        setPracticeCardCount(options.count);
        setActiveCardIndex(0);
        setSidesVisible(1);
    };

    const { mutate: mutateReview } = reviewCard;

    const removeCardAtIndex = (index: number) => {
        queryClient.setQueryData(
            ['cards', 'due', practiceMode, practiceDeckId, practiceCardCount],
            (oldCards: { data?: CardOut[] }) => {
                if (!oldCards?.data) return oldCards;
                return {
                    ...oldCards,
                    data: oldCards.data.filter(
                        (_: CardOut, i: number) => i !== index
                    ),
                };
            }
        );
    };

    const nextCard = () => {
        if (dueCards?.data && activeCardIndex < dueCards.data.length - 1) {
            setActiveCardIndex((prev) => prev + 1);
            setSidesVisible(1);
        }
    };

    const prevCard = () => {
        if (activeCardIndex > 0) {
            setActiveCardIndex((prev) => prev - 1);
            setSidesVisible(1);
        }
    };

    const revealNext = useCallback(() => {
        if (sidesVisible < activeCardSides.length) {
            setSidesVisible((prev) => prev + 1);
        }
    }, [activeCardSides.length, sidesVisible]);

    function getDaysSinceText(card: CardOut): string {
        const nrOverdueDays = daysSince(new Date(card.next_review_date));
        if (nrOverdueDays == 1) {
            return `Due 1 day ago`;
        } else {
            return `Due ${nrOverdueDays} days ago`;
        }
    }

    useEffect(() => {
        const actions = createActions({
            'card-forgot': () => mutateReview('forgot'),
            'card-ok': () => mutateReview('ok'),
            'reveal-next': revealNext,
        });

        Object.entries(actions).forEach(([action, handler]) => {
            registerAction(action, handler);
        });

        return () => {
            Object.keys(actions).forEach((action) => {
                unregisterAction(action);
            });
        };
    }, [registerAction, unregisterAction, mutateReview, revealNext]);

    return (
        <div className="flex h-[calc(100dvh-4rem)] w-full flex-col items-center justify-between gap-4 py-4">
            {isPending && !isError && <p>loading</p>}
            {!isPending && isError && <p>error!</p>}
            {dueCards?.data?.length === 0 && (
                <PracticeModeAlert onStartPractice={startPracticeMode} />
            )}
            {activeCard && (
                <>
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
                                            href={`/decks/${activeCard.deck_id}`}
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
                                        activeCardIndex >=
                                            dueCards.data.length - 1
                                    }
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
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
                        </CardContent>
                        <CardFooter className="flex flex-row justify-center gap-4">
                            {activeCard.overdue && (
                                <p className="text-destructive text-sm">
                                    {getDaysSinceText(activeCard)}
                                </p>
                            )}
                        </CardFooter>
                    </Card>
                    <div className="flex flex-col items-center gap-4">
                        {sidesVisible < activeCardSides.length && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        onClick={revealNext}
                                        className="h-10"
                                    >
                                        Reveal next side
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
                        <div className="flex gap-4">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        className="h-12 w-30"
                                        onClick={() => {
                                            if (!practiceMode) {
                                                reviewCard.mutate('forgot');
                                            } else {
                                                removeCardAtIndex(
                                                    activeCardIndex
                                                );
                                            }
                                        }}
                                    >
                                        Forgor
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
                                        className="h-12 w-30"
                                        onClick={() => {
                                            if (!practiceMode) {
                                                reviewCard.mutate('ok');
                                            } else {
                                                removeCardAtIndex(
                                                    activeCardIndex
                                                );
                                            }
                                        }}
                                    >
                                        I got it :)
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
                        {practiceMode && (
                            <p className="text-muted-foreground text-xs">
                                Practice mode: Your reviews are not saved.
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
