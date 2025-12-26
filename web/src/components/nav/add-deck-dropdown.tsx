import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Dropzone,
    DropzoneContent,
    DropzoneEmptyState,
} from '@/components/ui/shadcn-io/dropzone';
import { importDeckDecksImportPost, createDeckDecksPost } from '@/gen/sdk.gen';
import { ImportFormat } from '@/gen/types.gen';
import { deckFormSchema, DeckFormValues } from '@/lib/schemas/deck';
import { getErrorMessage } from '@/lib/utils';

const IMPORT_FORMATS = {
    repeater: {
        id: 'repeater' as ImportFormat,
        name: 'Repeater',
        accept: { 'application/json': ['.json'] },
        available: true,
    },
    mochi_markdown: {
        id: 'mochi_markdown' as ImportFormat,
        name: 'Mochi (markdown)',
        accept: { 'text/markdown': ['.md'], 'application/zip': ['.zip'] },
        available: true,
    },
    mochi: {
        id: 'mochi' as ImportFormat,
        name: 'Mochi (.mochi)',
        accept: { 'application/octet-stream': ['.mochi'] },
        available: false,
    },
    anki: {
        id: 'anki' as ImportFormat,
        name: 'Anki',
        accept: { 'application/x-sqlite3': ['.apkg'] },
        available: false,
    },
} as const;

type ImportFormatConfig = (typeof IMPORT_FORMATS)[keyof typeof IMPORT_FORMATS];

export function AddDeckDropdown({
    trigger,
    side,
    align,
}: {
    trigger?: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
}) {
    enum AddDeckState {
        Initial,
        Creation,
        Import,
        ImportUpload,
    }

    const queryClient = useQueryClient();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [addDeckState, setAddDeckState] = useState(AddDeckState.Initial);
    const [selectedFormat, setSelectedFormat] =
        useState<ImportFormatConfig | null>(null);
    const [files, setFiles] = useState<File[] | undefined>();

    const deckForm = useForm<DeckFormValues>({
        resolver: zodResolver(deckFormSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const handleOpenChange = (open: boolean) => {
        // Reset dropdown state when opening
        setDropdownOpen(open);
        if (open) {
            setAddDeckState(AddDeckState.Initial);
            deckForm.reset();
            setFiles(undefined);
            setSelectedFormat(null);
        }
    };

    const handleDeckCreate = async (values: DeckFormValues) => {
        try {
            await createDeckDecksPost({
                body: {
                    name: values.name,
                    description: values.description,
                },
            });
            queryClient.invalidateQueries({
                queryKey: ['decks'],
            });
            deckForm.reset();
            setDropdownOpen(false);
        } catch (error) {
            toast.error(
                <div>
                    <p>Failed to create deck</p>
                    <p className="text-muted-foreground text-xs">
                        {getErrorMessage(error)}
                    </p>
                </div>
            );
        }
    };

    return (
        <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent side={side} align={align}>
                {addDeckState === AddDeckState.Initial && (
                    <>
                        <div className="flex flex-col gap-2 p-2">
                            <Button
                                variant="outline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setAddDeckState(AddDeckState.Creation);
                                }}
                            >
                                Create deck
                            </Button>
                            <Button
                                variant="outline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setAddDeckState(AddDeckState.Import);
                                }}
                            >
                                Import deck
                            </Button>
                        </div>
                    </>
                )}
                {addDeckState === AddDeckState.Creation && (
                    <>
                        <DropdownMenuLabel className="text-muted-foreground">
                            Create deck
                        </DropdownMenuLabel>
                        <Form {...deckForm}>
                            <form
                                className="flex flex-col gap-2 p-2"
                                onSubmit={deckForm.handleSubmit(
                                    handleDeckCreate
                                )}
                                onKeyDown={(e) => {
                                    // Prevent dropdown from handling Tab key
                                    if (e.key === 'Tab') {
                                        e.stopPropagation();
                                    }
                                }}
                            >
                                <FormField
                                    control={deckForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="Deck name"
                                                    className="w-full"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={deckForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="Description (optional)"
                                                    className="w-full"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setAddDeckState(
                                                AddDeckState.Initial
                                            );
                                            deckForm.reset();
                                        }}
                                    >
                                        Back
                                    </Button>
                                    <Button type="submit" className="flex-1">
                                        Create
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </>
                )}
                {addDeckState === AddDeckState.Import && (
                    <>
                        <DropdownMenuLabel className="text-muted-foreground">
                            Import deck
                        </DropdownMenuLabel>
                        <div className="flex flex-col gap-2 p-2">
                            {Object.values(IMPORT_FORMATS).map((format) => (
                                <Button
                                    key={format.id}
                                    variant="outline"
                                    className={
                                        format.available
                                            ? 'flex justify-start'
                                            : 'relative flex justify-start'
                                    }
                                    disabled={!format.available}
                                    onClick={() => {
                                        if (format.available) {
                                            setSelectedFormat(format);
                                            setAddDeckState(
                                                AddDeckState.ImportUpload
                                            );
                                        }
                                    }}
                                >
                                    {format.name}
                                    {!format.available && (
                                        <div className="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-md px-1.5 py-0.5 text-[0.5rem]">
                                            SOON
                                        </div>
                                    )}
                                </Button>
                            ))}
                            <Button
                                variant="secondary"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setAddDeckState(AddDeckState.Initial);
                                    setSelectedFormat(null);
                                }}
                            >
                                Back
                            </Button>
                        </div>
                    </>
                )}
                {addDeckState === AddDeckState.ImportUpload &&
                    selectedFormat && (
                        <>
                            <DropdownMenuLabel className="text-muted-foreground">
                                Import {selectedFormat.name}
                            </DropdownMenuLabel>
                            <div className="flex flex-col gap-2 p-2">
                                <Dropzone
                                    accept={selectedFormat.accept}
                                    maxFiles={1}
                                    maxSize={1024 * 1024}
                                    onDrop={(files: File[]) => {
                                        setFiles(files);
                                        console.log(files);
                                    }}
                                    onError={(error) =>
                                        toast.error(
                                            <div>
                                                <p>File upload failed</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {getErrorMessage(error)}
                                                </p>
                                            </div>
                                        )
                                    }
                                    src={files}
                                >
                                    <DropzoneEmptyState />
                                    <DropzoneContent />
                                </Dropzone>

                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1"
                                        variant="secondary"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setAddDeckState(
                                                AddDeckState.Import
                                            );
                                            setFiles(undefined);
                                        }}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (
                                                !files?.length ||
                                                !selectedFormat
                                            ) {
                                                return;
                                            }

                                            const handleImport = async () => {
                                                try {
                                                    await importDeckDecksImportPost(
                                                        {
                                                            body: {
                                                                file: files[0],
                                                            },
                                                            query: {
                                                                format: selectedFormat.id,
                                                            },
                                                        }
                                                    );
                                                    queryClient.invalidateQueries(
                                                        {
                                                            queryKey: ['decks'],
                                                        }
                                                    );
                                                    setDropdownOpen(false);
                                                } catch (error) {
                                                    setDropdownOpen(false);
                                                    throw error;
                                                }
                                            };

                                            toast.promise(handleImport(), {
                                                loading: `Importing ${files[0].name}...`,
                                                success: `Successfully imported ${files[0].name}`,
                                                error: (error) => (
                                                    <div>
                                                        <p>
                                                            Couldn&apos;t import{' '}
                                                            <span className="font-mono">
                                                                {files[0].name}
                                                            </span>
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {getErrorMessage(
                                                                error
                                                            )}
                                                        </p>
                                                    </div>
                                                ),
                                            });
                                        }}
                                    >
                                        Import
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
