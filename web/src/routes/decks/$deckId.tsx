import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
    MoreVertical,
    FileDown,
    Pause,
    Play,
    Archive,
    ArchiveRestore,
    Trash,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import CardInspectDialog from '@/components/card-inspect-dialog';
import CardsGrid from '@/components/cards-grid';
import DeckPathBreadcrumbs from '@/components/deck-path-breadcrumbs';
import MobileAppBar from '@/components/mobile-app-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
    DeckOut,
    DeckUpdate,
    getDeckDecksDeckIdGet,
    getCardsCardsGet,
    getUserDeckStatisticsStatsDeckIdGet,
    getReviewHistoryReviewsCardIdGet,
    updateDeckDecksDeckIdPatch,
    deleteDeckDecksDeckIdDelete,
} from '@/gen';
import { apiUrl } from '@/lib/api-url';
import { formatDateForDisplay, getErrorMessage } from '@/lib/utils';

export const Route = createFileRoute('/decks/$deckId')({
    loader: async ({ context: { queryClient }, params: { deckId } }) => {
        const [deck, cards, stats] = await Promise.all([
            queryClient.ensureQueryData({
                queryKey: ['decks', deckId],
                queryFn: () =>
                    getDeckDecksDeckIdGet({ path: { deck_id: deckId } }),
            }),
            queryClient.ensureQueryData({
                queryKey: ['cards', deckId],
                queryFn: () =>
                    getCardsCardsGet({
                        query: { deck_id: deckId },
                    }),
            }),
            queryClient.ensureQueryData({
                queryKey: ['stats', deckId],
                queryFn: () =>
                    getUserDeckStatisticsStatsDeckIdGet({
                        path: { deck_id: deckId },
                    }),
            }),
        ]);
        return { deck, cards, stats };
    },
    component: DeckPage,
});

function DeckPage() {
    const { deckId } = Route.useParams();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const {
        data: deck,
        isLoading: isDeckLoading,
        isError: isDeckError,
        error: deckError,
    } = useQuery({
        queryKey: ['decks', deckId],
        queryFn: () => getDeckDecksDeckIdGet({ path: { deck_id: deckId } }),
    });

    const {
        data: cards,
        isLoading: isCardsLoading,
        isError: isCardsError,
        error: cardsError,
    } = useQuery({
        queryKey: ['cards', deckId],
        queryFn: () =>
            getCardsCardsGet({
                query: { deck_id: deckId },
            }),
    });

    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ['stats', deckId],
        queryFn: () =>
            getUserDeckStatisticsStatsDeckIdGet({ path: { deck_id: deckId } }),
    });

    function prefetchCardHistory(cardId: string) {
        queryClient.prefetchQuery({
            queryKey: ['reviews', cardId],
            queryFn: () =>
                getReviewHistoryReviewsCardIdGet({ path: { card_id: cardId } }),
            staleTime: 5 * 60 * 1000,
        });
    }

    const [cardInspectDialogOpen, setCardInspectDialogOpen] = useState(false);
    const [activeCardIndex, setActiveCardIndex] = useState(-1);
    const activeCard = cards?.data?.[activeCardIndex];

    function nextCard() {
        if (cards?.data && activeCardIndex < cards.data.length - 1) {
            setActiveCardIndex((prev) => prev + 1);
        }
    }

    function prevCard() {
        if (activeCardIndex > 0) {
            setActiveCardIndex((prev) => prev - 1);
        }
    }

    const updateDeckMutation = useMutation({
        mutationFn: (values: z.infer<typeof deckUpdateSchema>) =>
            updateDeckDecksDeckIdPatch({
                path: { deck_id: deckId },
                body: values,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decks', deckId] });
            queryClient.invalidateQueries({ queryKey: ['decks', 'tree'] });
            queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
        },
        onError: (error) => {
            toast.error(
                <div>
                    <p>Failed to update deck</p>
                    <p className="text-muted-foreground text-xs">
                        {getErrorMessage(error)}
                    </p>
                </div>
            );
        },
    });

    const togglePauseDeckMutation = useMutation({
        mutationFn: (deck: DeckOut) =>
            updateDeckDecksDeckIdPatch({
                path: { deck_id: deck.id },
                body: { is_paused: !deck.is_paused },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decks', deckId] });
            queryClient.invalidateQueries({ queryKey: ['decks', 'tree'] });
        },
    });

    const exportDeckMutation = useMutation({
        mutationFn: async (deck: DeckOut) => {
            // Use fetch client directly due to issue with hey-api
            // https://github.com/hey-api/openapi-ts/issues/804
            const response = await fetch(`${apiUrl}/decks/${deck.id}/export`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.status}`);
            }

            const disposition = response.headers.get('Content-Disposition');
            const filenameMatch = disposition?.match(/filename="(.+)"/);
            const filename = filenameMatch?.[1] ?? 'deck.json';

            const blob = await response.blob();
            return { blob, filename };
        },
        onSuccess: ({ blob, filename }) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
    });

    const toggleArchiveDeckMutation = useMutation({
        mutationFn: (deck: DeckOut) =>
            updateDeckDecksDeckIdPatch({
                path: { deck_id: deck.id },
                body: { is_archived: !deck.is_archived },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decks', deckId] });
            queryClient.invalidateQueries({ queryKey: ['decks', 'tree'] });
        },
    });

    const deleteDeckMutation = useMutation({
        mutationFn: (deck: DeckOut) =>
            deleteDeckDecksDeckIdDelete({ path: { deck_id: deck.id } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decks'] });
            navigate({ to: '/decks' });
        },
    });

    const deckUpdateSchema = z.object({
        name: z.string().min(1, 'Deck must have a name'),
        description: z.string().optional(),
        parent_id: z.string().optional(),
    }) satisfies z.ZodType<DeckUpdate>;

    const deckForm = useForm<z.infer<typeof deckUpdateSchema>>({
        resolver: zodResolver(deckUpdateSchema),
        defaultValues: {
            name: deck?.data?.name,
            description: deck?.data?.description || '',
            parent_id: deck?.data?.parent_id || undefined,
        },
    });

    useEffect(() => {
        if (deck?.data) {
            deckForm.reset({
                name: deck.data.name,
                description: deck.data.description || '',
                parent_id: deck.data.parent_id || undefined,
            });
        }
    }, [deck?.data, deckForm]);

    function handleBlurSave() {
        if (deckForm.formState.isDirty) {
            deckForm.handleSubmit((data) => {
                updateDeckMutation.mutate(data);
            })();
        }
    }

    if (isDeckError) {
        return (
            <>
                <MobileAppBar />
                <div className="container mx-auto flex h-full w-full items-center justify-center px-6 py-6">
                    <div className="text-center">
                        <h1 className="mb-4 text-xl font-medium">
                            Error loading deck. Try again.
                        </h1>
                        <p className="text-destructive">
                            {deckError.message}
                        </p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <MobileAppBar>
                {deck?.data && (
                    <DeckPathBreadcrumbs
                        path={deck.data.path}
                        showFullPath={false}
                        showDecksRoot
                        highlightLast
                    />
                )}
            </MobileAppBar>
            <div className="container mx-auto px-6 py-6">
                <Form {...deckForm}>
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                    {/* Left column - Title + Description */}
                    <div className="lg:col-span-1">
                        {isDeckLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-64" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : (
                            deck?.data && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        {deck.data.path.length > 1 && (
                                            <div className="text-muted-foreground hidden md:flex">
                                                <DeckPathBreadcrumbs
                                                    path={deck.data.path.slice(
                                                        0,
                                                        -1
                                                    )}
                                                    showFullPath
                                                    showDecksRoot
                                                    trailingSeparator
                                                />
                                            </div>
                                        )}
                                        <FormField
                                            control={deckForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem className="min-w-0 flex-1">
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            onBlur={() => {
                                                                field.onBlur();
                                                                handleBlurSave();
                                                            }}
                                                            className="h-auto rounded-none border-none bg-transparent p-0 text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-2xl"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 shrink-0 p-0"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                    <span className="sr-only">
                                                        Open menu
                                                    </span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                side="right"
                                                align="start"
                                                className="w-48"
                                            >
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        togglePauseDeckMutation.mutate(
                                                            deck.data
                                                        )
                                                    }
                                                >
                                                    {deck.data.is_paused ? (
                                                        <>
                                                            <Play className="mr-2 h-4 w-4" />
                                                            Resume
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Pause className="mr-2 h-4 w-4" />
                                                            Pause
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        exportDeckMutation.mutate(
                                                            deck.data
                                                        )
                                                    }
                                                >
                                                    <FileDown className="mr-2 h-4 w-4" />
                                                    Export
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        toggleArchiveDeckMutation.mutate(
                                                            deck.data
                                                        )
                                                    }
                                                >
                                                    {deck.data.is_archived ? (
                                                        <>
                                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                                            Unarchive
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Archive className="mr-2 h-4 w-4" />
                                                            Archive
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() =>
                                                        deleteDeckMutation.mutate(
                                                            deck.data
                                                        )
                                                    }
                                                >
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <FormField
                                        control={deckForm.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
                                                        onBlur={() => {
                                                            field.onBlur();
                                                            handleBlurSave();
                                                        }}
                                                        placeholder="No description"
                                                        className="text-muted-foreground min-h-0 resize-none rounded-none border-none bg-transparent p-0 leading-relaxed shadow-none focus-visible:ring-0"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )
                        )}
                    </div>

                    {/* Right column - Statistics */}
                    <div className="lg:col-span-2">
                        {isStatsLoading ? (
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                {[...Array(4)].map((_, i) => (
                                    <Card key={i} className="p-4">
                                        <Skeleton className="mb-2 h-4 w-16" />
                                        <Skeleton className="h-8 w-12" />
                                    </Card>
                                ))}
                            </div>
                        ) : stats?.data ? (
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <Card className="p-4">
                                    <p className="text-muted-foreground mb-1 text-sm">
                                        Last studied
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.data.last_studied
                                            ? formatDateForDisplay(
                                                  stats.data.last_studied
                                              )
                                            : 'No data'}
                                    </p>
                                </Card>
                                <Card className="p-4">
                                    <p className="text-muted-foreground mb-1 text-sm">
                                        Retention rate
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.data.retention_rate}
                                    </p>
                                </Card>
                                <Card className="p-4">
                                    <p className="text-muted-foreground mb-1 text-sm">
                                        Total reviews
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.data.total_reviews}
                                    </p>
                                </Card>
                                <Card className="p-4">
                                    <p className="text-muted-foreground mb-1 text-sm">
                                        Difficulty
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.data.difficulty_ranking}
                                    </p>
                                </Card>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">
                                No statistics available
                            </p>
                        )}
                    </div>
                </div>
            </Form>
            <div className="mt-10">
                <h2 className="mb-6 text-xl font-semibold">Cards</h2>
                <CardsGrid
                    cards={cards?.data}
                    isLoading={isCardsLoading}
                    isError={isCardsError}
                    error={cardsError}
                    onCardClick={(cardIndex) => {
                        setActiveCardIndex(cardIndex);
                        setCardInspectDialogOpen(true);
                    }}
                    onCardMouseEnter={(cardId) => {
                        prefetchCardHistory(cardId);
                    }}
                    onCardCreated={() => {
                        queryClient.invalidateQueries({ queryKey: ['cards'] });
                    }}
                    defaultDeckId={deckId}
                />
            </div>

                {activeCard && (
                    <CardInspectDialog
                        card={activeCard}
                        open={cardInspectDialogOpen}
                        onOpenChange={setCardInspectDialogOpen}
                        onUpdateSuccess={() => {
                            queryClient.invalidateQueries({
                                queryKey: ['cards'],
                            });
                        }}
                        onDeleteSuccess={() => {
                            queryClient.invalidateQueries({
                                queryKey: ['cards'],
                            });
                        }}
                        onNext={nextCard}
                        onPrev={prevCard}
                        hasNext={
                            cards.data &&
                            activeCardIndex < cards.data.length - 1
                        }
                        hasPrev={activeCardIndex !== 0}
                    />
                )}
            </div>
        </>
    );
}
