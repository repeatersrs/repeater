export enum ShortcutScope {
    Decks = 'decks',
    Cards = 'cards',
    Profile = 'profile',
    Review = 'review',
}
export interface ShortcutConfig {
    key: string;
    action: string;
    description: string;
    scope: ShortcutScope;
}

export const SHORTCUT_CONFIG: ShortcutConfig[] = [
    {
        key: 'j',
        action: 'card-forgot',
        description: 'Mark card as forgotten',
        scope: ShortcutScope.Review,
    },
    {
        key: 'l',
        action: 'card-ok',
        description: 'Mark card as remembered',
        scope: ShortcutScope.Review,
    },
    {
        key: 'space',
        action: 'reveal-next',
        description: 'Reveal next side',
        scope: ShortcutScope.Review,
    },
    {
        key: 'arrowleft',
        action: 'card-prev',
        description: 'Go to the previous card',
        scope: ShortcutScope.Cards,
    },
    {
        key: 'arrowright',
        action: 'card-next',
        description: 'Go to the next card',
        scope: ShortcutScope.Cards,
    },
    {
        key: 'arrowleft',
        action: 'deck-prev',
        description: 'Go to the previous deck',
        scope: ShortcutScope.Decks,
    },
    {
        key: 'arrowright',
        action: 'deck-next',
        description: 'Go to the next deck',
        scope: ShortcutScope.Decks,
    },
];
