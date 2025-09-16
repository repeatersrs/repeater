export interface ShortcutConfig {
    key: string;
    action: string;
    description: string;
    scope: 'decks' | 'cards' | 'profile' | 'review';
}

export const SHORTCUT_CONFIG: ShortcutConfig[] = [
    {
        key: 'j',
        action: 'card-forgot',
        description: 'Mark card as forgotten',
        scope: 'review',
    },
    {
        key: 'l',
        action: 'card-ok',
        description: 'Mark card as remembered',
        scope: 'review',
    },
    {
        key: 'space',
        action: 'reveal-next',
        description: 'Reveal next side',
        scope: 'review',
    },
    {
        key: 'arrowleft',
        action: 'card-prev',
        description: 'Go to the previous card',
        scope: 'cards',
    },
    {
        key: 'arrowright',
        action: 'card-next',
        description: 'Go to the next card',
        scope: 'cards',
    },
    {
        key: 'arrowleft',
        action: 'deck-prev',
        description: 'Go to the previous deck',
        scope: 'decks',
    },
    {
        key: 'arrowright',
        action: 'deck-next',
        description: 'Go to the next deck',
        scope: 'decks',
    },
];
