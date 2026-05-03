export enum ShortcutScope {
    Global = 'global',
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
    primary?: boolean;
}

export const SHORTCUT_CONFIG: ShortcutConfig[] = [
    {
        key: 'c',
        action: 'create-card',
        description: 'Create card',
        scope: ShortcutScope.Global,
        primary: true,
    },
    {
        key: 'f',
        action: 'card-forgot',
        description: 'Mark card as forgotten',
        scope: ShortcutScope.Review,
        primary: true,
    },
    {
        key: 'j',
        action: 'card-forgot',
        description: 'Mark card as forgotten',
        scope: ShortcutScope.Review,
    },
    {
        key: 'r',
        action: 'card-ok',
        description: 'Mark card as remembered',
        scope: ShortcutScope.Review,
        primary: true,
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
        key: 'e',
        action: 'card-edit',
        description: 'Edit current card',
        scope: ShortcutScope.Review,
        primary: true,
    },
    {
        key: 'z',
        action: 'review-undo',
        description: 'Undo last review',
        scope: ShortcutScope.Review,
        primary: true,
    },
    {
        key: 'ctrl+z',
        action: 'review-undo',
        description: 'Undo last review',
        scope: ShortcutScope.Review,
    },
    {
        key: 'y',
        action: 'review-redo',
        description: 'Redo last undone review',
        scope: ShortcutScope.Review,
        primary: true,
    },
    {
        key: 'ctrl+y',
        action: 'review-redo',
        description: 'Redo last undone review',
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
    {
        key: 'arrowleft',
        action: 'card-prev',
        description: 'Go to the previous card',
        scope: ShortcutScope.Review,
    },
    {
        key: 'arrowright',
        action: 'card-next',
        description: 'Go to the next card',
        scope: ShortcutScope.Review,
    },
];
