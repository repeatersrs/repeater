import { useHotkeys } from 'react-hotkeys-hook';
import { Hotkey } from 'react-hotkeys-hook/packages/react-hotkeys-hook/dist/types';

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

    function modifiersMatch(handler: Hotkey, event: KeyboardEvent) {
        return (
            !!handler.ctrl === event.ctrlKey &&
            !!handler.shift === event.shiftKey &&
            !!handler.alt === event.altKey &&
            !!handler.meta === event.metaKey
        );
    }

    function getKeyWithModifiers(handler: Hotkey, eventKey?: string): string {
        const baseKey = handler.keys?.[0] || eventKey || '';

        const modifiers: string[] = [];

        if (handler.ctrl) modifiers.push('ctrl');
        if (handler.shift) modifiers.push('shift');
        if (handler.alt) modifiers.push('alt');
        if (handler.meta) modifiers.push('meta'); // Command key on Mac

        if (modifiers.length > 0) {
            return `${modifiers.join('+')}+${baseKey}`;
        }

        return baseKey;
    }

    function getActionForEvent(event: KeyboardEvent, handler: Hotkey) {
        if (!modifiersMatch(handler, event)) return undefined;

        const key = getKeyWithModifiers(handler, event.key);
        return keyToAction[key];
    }

    const allKeys = shortcuts.map((s) => s.key);

    useHotkeys(
        allKeys,
        (event, handler) => {
            const action = getActionForEvent(event, handler);
            if (action) {
                executeAction(action);
            }
        },
        {
            enabled,
            preventDefault: (event, handler) =>
                getActionForEvent(event, handler) !== undefined,
            enableOnFormTags: false,
            enableOnContentEditable: false,
            keydown: true,
            keyup: false,
            useKey: true,
        }
    );

    return shortcuts;
};
