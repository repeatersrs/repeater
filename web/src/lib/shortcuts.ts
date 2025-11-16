import { SHORTCUT_CONFIG, ShortcutScope } from '@/config/shortcuts';

export function createActions<T extends Record<string, () => void>>(
    actions: T & Record<string, () => void>
): T {
    const allowedActions = new Set(SHORTCUT_CONFIG.map((c) => c.action));
    const providedActions = new Set(Object.keys(actions));

    const diff = providedActions.difference(allowedActions);
    if (diff.size > 0) {
        throw new Error(`Unknown action(s): ${Array.from(diff)}`);
    }
    return actions;
}

export function getShortcutsForScope(scope: ShortcutScope) {
    return SHORTCUT_CONFIG.filter((shortcut) => shortcut.scope === scope);
}

export function getShortcut(action: string, scope: ShortcutScope) {
    const shortcut = SHORTCUT_CONFIG.find(
        (item) => item.action === action && item.scope === scope
    );
    if (shortcut === undefined) {
        throw new Error(`Unknown action ${action} or scope ${scope}`);
    }
    return shortcut;
}
