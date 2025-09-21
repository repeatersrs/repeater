import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Dropzone,
    DropzoneContent,
    DropzoneEmptyState,
} from '@/components/ui/shadcn-io/dropzone';
import { importDeckDecksImportPost } from '@/gen/sdk.gen';
import { ImportFormat } from '@/gen/types.gen';

export function AddDeckDropdown({
    trigger,
    side,
}: {
    trigger?: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
}) {
    enum DropdownState {
        Initial,
        Creation,
        Import,
        ImportUpload,
    }

    const queryClient = useQueryClient();

    const [dropdownState, setDropdownState] = useState(DropdownState.Initial);
    const [importFormat, setImportFormat] = useState<ImportFormat | null>(null);
    const [deckName, setDeckName] = useState('');
    const [deckDescription, setDeckDescription] = useState('');
    const [files, setFiles] = useState<File[]>();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent side={side}>
                {dropdownState === DropdownState.Initial && (
                    <>
                        <div className="flex flex-col gap-2 p-2">
                            <Button
                                variant="outline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setDropdownState(DropdownState.Creation);
                                }}
                            >
                                Create deck
                            </Button>
                            <Button
                                variant="outline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setDropdownState(DropdownState.Import);
                                }}
                            >
                                Import deck
                            </Button>
                        </div>
                    </>
                )}
                {dropdownState === DropdownState.Creation && (
                    <>
                        <DropdownMenuLabel className="text-muted-foreground">
                            Create deck
                        </DropdownMenuLabel>
                        <div className="flex flex-col gap-2 p-2">
                            <div className="flex flex-col gap-2">
                                <Input
                                    id="deck-name"
                                    type="text"
                                    placeholder="Deck name"
                                    value={deckName}
                                    onChange={(e) =>
                                        setDeckName(e.target.value)
                                    }
                                    className="w-full"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Input
                                    id="deck-description"
                                    type="text"
                                    placeholder="Description"
                                    value={deckDescription}
                                    onChange={(e) =>
                                        setDeckDescription(e.target.value)
                                    }
                                    className="w-full"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setDropdownState(DropdownState.Initial);
                                        setDeckName('');
                                        setDeckDescription('');
                                    }}
                                >
                                    Back
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        console.log('Create deck:', {
                                            deckName,
                                            deckDescription,
                                        });
                                    }}
                                >
                                    Create
                                </Button>
                            </div>
                        </div>
                    </>
                )}
                {dropdownState === DropdownState.Import && (
                    <>
                        <DropdownMenuLabel className="text-muted-foreground">
                            Import deck
                        </DropdownMenuLabel>
                        <div className="flex flex-col gap-2 p-2">
                            <Button
                                variant="outline"
                                className="flex justify-start"
                                onClick={() => {
                                    setImportFormat('repeater');
                                    setDropdownState(
                                        DropdownState.ImportUpload
                                    );
                                }}
                            >
                                Repeater
                            </Button>
                            <Button
                                variant="outline"
                                className="flex justify-start"
                                onClick={() => {
                                    setImportFormat('mochi_markdown');
                                    setDropdownState(
                                        DropdownState.ImportUpload
                                    );
                                }}
                            >
                                Mochi (markdown)
                            </Button>
                            <Button
                                variant="outline"
                                className="relative flex justify-start"
                                disabled
                            >
                                Mochi (.mochi)
                                <div className="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-md px-1.5 py-0.5 text-[0.5rem]">
                                    SOON
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="relative flex justify-start"
                                disabled
                            >
                                Anki
                                <div className="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-md px-1.5 py-0.5 text-[0.5rem]">
                                    SOON
                                </div>
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setDropdownState(DropdownState.Initial);
                                }}
                            >
                                Back
                            </Button>
                        </div>
                    </>
                )}
                {dropdownState === DropdownState.ImportUpload && (
                    <>
                        <DropdownMenuLabel className="text-muted-foreground">
                            Import deck / Upload
                        </DropdownMenuLabel>
                        <div className="flex flex-col gap-2 p-2">
                            <Dropzone
                                accept={{
                                    'application/zip': ['.zip'],
                                    'text/markdown': ['.md'],
                                }}
                                maxFiles={1}
                                maxSize={1024 * 1024 * 50}
                                onDrop={(files: File[]) => {
                                    setFiles(files);
                                    console.log(files);
                                }}
                                onError={console.error} // TODO: add proper error handling
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
                                        setDropdownState(DropdownState.Import);
                                        setFiles([]);
                                    }}
                                >
                                    Back
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        if (!files?.length || !importFormat) {
                                            return;
                                        }

                                        try {
                                            await importDeckDecksImportPost({
                                                body: { file: files[0] },
                                                query: { format: importFormat },
                                            });
                                            queryClient.invalidateQueries({
                                                queryKey: ['decks'],
                                            });
                                            // TODO: Add success handling (e.g., refresh decks list, close dropdown)
                                        } catch (error) {
                                            // TODO: Add error handling
                                            console.error(
                                                'Import failed:',
                                                error
                                            );
                                        }
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
