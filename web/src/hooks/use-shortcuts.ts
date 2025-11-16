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

    const allKeys = shortcuts.map((s) => s.key);

    useHotkeys(
        allKeys,
        (event, handler) => {
            const key = getKeyWithModifiers(handler, event.key);
            const action = keyToAction[key];
            if (action) {
                executeAction(action);
            }
        },
        {
            enabled,
            preventDefault: true,
            enableOnFormTags: false,
            enableOnContentEditable: false,
            keydown: true,
            keyup: false,
        }
    );

    return shortcuts;
};
