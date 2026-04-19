'use client';

import { BoldPlugin, ItalicPlugin } from '@platejs/basic-nodes/react';
import type { Value } from 'platejs';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import * as React from 'react';

import { FloatingToolbar } from '@/components/ui/floating-toolbar';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { cn } from '@/lib/utils';

export interface EditorFieldProps extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'onChange'
> {
    value?: Value;
    onChange?: (value: Value) => void;
    placeholder?: string;
}

export function EditorField({
    value,
    onChange,
    placeholder = 'Type here...',
    className,
    ...props
}: EditorFieldProps) {
    const editor = usePlateEditor({
        plugins: [BoldPlugin, ItalicPlugin],
        value: value ?? [{ type: 'p', children: [{ text: '' }] }],
    });

    return (
        <Plate
            editor={editor}
            onChange={({ value }) => {
                onChange?.(value);
            }}
            {...props}
        >
            <FloatingToolbar>
                {/* TODO: make keyboard shortcut modifier adapt based on system */}
                <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
                    B
                </MarkToolbarButton>
                <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
                    I
                </MarkToolbarButton>
            </FloatingToolbar>
            <PlateContent
                placeholder={placeholder}
                className={cn(
                    'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                    className
                )}
            />
        </Plate>
    );
}
