import { useQuery } from '@tanstack/react-query';

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getDecksDecksGet } from '@/gen';

interface DeckSelectorProps {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function DeckSelector({
    value,
    defaultValue,
    onValueChange,
    placeholder = 'Select a deck',
    disabled = false,
}: DeckSelectorProps) {
    const { data: decks, isLoading } = useQuery({
        queryKey: ['decks'],
        queryFn: () => getDecksDecksGet(),
    });

    return (
        <Select
            value={value}
            defaultValue={defaultValue}
            onValueChange={onValueChange}
            disabled={disabled || isLoading}
        >
            <SelectTrigger>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Deck</SelectLabel>
                </SelectGroup>
                {decks?.data?.map((deck) => (
                    <SelectItem value={deck.id} key={deck.id}>
                        {deck.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
