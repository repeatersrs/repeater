import { Space } from 'lucide-react';
import { ReactNode } from 'react';

import { Kbd as UiKbd } from '@/components/ui/kbd';
import { ShortcutScope } from '@/config/shortcuts';
import { getShortcut } from '@/lib/shortcuts';

interface KbdProps {
    action: string;
    scope: ShortcutScope;
    className?: string;
}

function isMacPlatform() {
    if (typeof navigator === 'undefined') return false;

    return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function getKeyLabels(): Record<string, ReactNode> {
    const isMac = isMacPlatform();

    return {
        alt: isMac ? '⌥' : 'Alt',
        arrowdown: '↓',
        arrowleft: '←',
        arrowright: '→',
        arrowup: '↑',
        ctrl: isMac ? '⌃' : 'Ctrl',
        escape: 'Esc',
        meta: isMac ? '⌘' : 'Win',
        mod: isMac ? '⌘' : 'Ctrl',
        shift: isMac ? '⇧' : 'Shift',
        space: <Space aria-label="Space" className="size-3" />,
    };
}

export default function Kbd({ action, scope, className }: KbdProps) {
    const shortcutKey = getShortcut(action, scope).key;

    if (!shortcutKey) return null;

    function formatKey(key: string) {
        const keyLabels = getKeyLabels();

        return key
            .split('+')
            .map((part) => keyLabels[part] ?? part.toUpperCase());
    }

    return <UiKbd className={className}>{formatKey(shortcutKey)}</UiKbd>;
}
