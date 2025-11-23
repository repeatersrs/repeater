import { CircleCheck, Shuffle } from 'lucide-react';
import { useState } from 'react';

import { DeckSelector } from '@/components/deck-selector';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PracticeModeAlertProps {
    onStartPractice: (options: { deckId?: string; count: number }) => void;
}

export function PracticeModeAlert({ onStartPractice }: PracticeModeAlertProps) {
    const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();
    const [cardCount, setCardCount] = useState(10);

    const handleStartPractice = () => {
        onStartPractice({
            deckId: selectedDeckId,
            count: cardCount,
        });
    };

    const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value > 0 && value <= 100) {
            setCardCount(value);
        }
    };

    return (
        <Alert className="bg-muted max-w-lg">
            <CircleCheck className="h-5 w-5" />
            <AlertTitle className="text-lg">All done!</AlertTitle>
            <AlertDescription className="text-muted-foreground mt-2">
                No due cards to review. Continue learning by practicing random
                cards. Your reviews in practice mode are not saved.
            </AlertDescription>

            <div className="mt-6 space-y-4">
                <div className="space-y-2">
                    <Label>Deck</Label>
                    <DeckSelector
                        value={selectedDeckId}
                        onValueChange={setSelectedDeckId}
                        placeholder="All decks"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Number of cards</Label>
                    <Input
                        type="number"
                        min={1}
                        max={100}
                        value={cardCount}
                        onChange={handleCountChange}
                        className="w-30"
                    />
                </div>

                <Button
                    onClick={handleStartPractice}
                    className="w-full"
                    size="lg"
                >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Start Practice Session
                </Button>
            </div>
        </Alert>
    );
}
