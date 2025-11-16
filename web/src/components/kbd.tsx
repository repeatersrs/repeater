import { ShortcutScope } from '@/config/shortcuts';
import { getShortcut } from '@/lib/shortcuts';

interface KbdProps {
    action: string;
    scope: ShortcutScope;
    className?: string;
}

export default function Kbd({ action, scope, className = '' }: KbdProps) {
    const shortcutKey = getShortcut(action, scope).key;

    if (!shortcutKey) return null;

    function formatKey(key: string) {
        return key
            .replace('ctrl+', '⌃')
            .replace('escape', 'Esc')
            .replace(' ', 'Space');
    }

    return (
        <kbd
            className={`bg-kbd text-primary inline-flex items-center justify-center rounded p-1 font-mono font-medium ${className}`}
        >
            {formatKey(shortcutKey)}
        </kbd>
    );
}
