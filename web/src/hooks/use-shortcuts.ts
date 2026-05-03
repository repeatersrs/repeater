import { useHotkeys } from 'react-hotkeys-hook';

import { useShortcutActions } from '@/components/shortcut-provider';
import { ShortcutScope } from '@/config/shortcuts';
import { getShortcutsForScope } from '@/lib/shortcuts';

export const usePageShortcuts = (scope: ShortcutScope, enabled = true) => {
    const { executeAction } = useShortcutActions();
    const shortcuts = getShortcutsForScope(scope);

    const keyToAction = shortcuts.reduce(
        (acc, { key, action }) => {
            acc[key] = action;
            return acc;
        },
        {} as Record<string, string>
    );

    function normalizeEventKey(event: KeyboardEvent) {
        if (event.key === ' ') return 'space';

        return event.key.toLowerCase();
    }

    function getKeyWithModifiers(event: KeyboardEvent): string {
        const key = normalizeEventKey(event);
        const modifiers: string[] = [];

        if (event.ctrlKey) modifiers.push('ctrl');
        if (event.shiftKey) modifiers.push('shift');
        if (event.altKey) modifiers.push('alt');
        if (event.metaKey) modifiers.push('meta'); // Command key on Mac

        if (modifiers.length > 0) {
            return `${modifiers.join('+')}+${key}`;
        }

        return key;
    }

    function getActionForEvent(event: KeyboardEvent) {
        return keyToAction[getKeyWithModifiers(event)];
    }

    const allKeys = shortcuts.map((s) => s.key);

    useHotkeys(
        allKeys,
        (event) => {
            const action = getActionForEvent(event);
            if (action) {
                executeAction(action);
            }
        },
        {
            enabled,
            preventDefault: (event) => getActionForEvent(event) !== undefined,
            enableOnFormTags: false,
            enableOnContentEditable: false,
            keydown: true,
            keyup: false,
            useKey: true,
        }
    );

    return shortcuts;
};
