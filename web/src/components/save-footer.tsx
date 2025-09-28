import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SaveFooterProps {
    onSave: () => void;
    onCancel: () => void;
    isSaving?: boolean;
    isError?: boolean;
    isDirty?: boolean;
    saveText?: string;
    cancelText?: string;
}

export default function SaveFooter({
    onSave,
    onCancel,
    isSaving = false,
    isError = false,
    isDirty = false,
    saveText = 'Save',
    cancelText = 'Discard',
}: SaveFooterProps) {
    if (!isDirty) return null;

    return (
        <div className="fixed right-0 bottom-0 left-0 z-50 p-4">
            <div className="mx-auto max-w-md">
                <Card className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur">
                    <div className="flex items-center justify-between gap-3 p-4">
                        <p className="text-sm">You have unsaved changes</p>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onCancel}
                                disabled={isSaving}
                            >
                                {cancelText}
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                onClick={onSave}
                                disabled={isSaving}
                            >
                                {isSaving
                                    ? 'Saving...'
                                    : isError
                                      ? 'Retry'
                                      : saveText}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
