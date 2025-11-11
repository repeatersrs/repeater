import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, CircleCheck } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import Markdown from 'react-markdown';

import Kbd from '@/components/kbd';
import { useShortcutActions } from '@/components/shortcut-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import { getCardsCardsGet, createReviewReviewsPost, CardOut } from '@/gen';
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
    usePageShortcuts('review');
    const { registerAction, unregisterAction } = useShortcutActions();
    const {
        isPending,
        isError,
        data: dueCards,
    } = useQuery({
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
            queryClient.invalidateQueries({ queryKey: ['cards'] });
            queryClient.invalidateQueries({
                queryKey: ['reviews', activeCard!.id],
            });
            queryClient.invalidateQueries({
                queryKey: ['stats'],
            });
            setSidesVisible(1);
        },
        // TODO: implement error handling
    });

    const { mutate: mutateReview } = reviewCard;

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
                <Alert className="bg-muted max-w-md">
                    <CircleCheck className="h-4 w-4" />
                    <AlertTitle>All done!</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                        No due cards to review.
                    </AlertDescription>
                </Alert>
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
                                            getShortcut('reveal-next', 'review')
                                                .description
                                        }
                                        <Kbd
                                            action="reveal-next"
                                            scope="review"
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
                                        onClick={() =>
                                            reviewCard.mutate('forgot')
                                        }
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
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
