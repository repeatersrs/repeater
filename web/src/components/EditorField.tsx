'use client';

import { MarkdownPlugin } from '@platejs/markdown';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import * as React from 'react';

/**
 * A reusable editor component that works like a standard <Textarea>,
 * accepting markdown string as `value`, `onChange`, and optional placeholder.
 *
 * Usage:
 *
 * <FormField
 *   control={form.control}
 *   name="content"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Content</FormLabel>
 *       <FormControl>
 *         <EditorField
 *           {...field}
 *           placeholder="Tell us a bit about yourself"
 *         />
 *       </FormControl>
 *       <FormDescription>Some helpful description...</FormDescription>
 *       <FormMessage />
 *     </FormItem>
 *   )}
 * />
 */
export interface EditorFieldProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /**
     * The current markdown string value.
     */
    value?: string;

    /**
     * Called when the editor value changes with the new markdown string.
     */
    onChange?: (value: string) => void;

    /**
     * Placeholder text to display when editor is empty.
     */
    placeholder?: string;
}

export function EditorField({
    value,
    onChange,
    placeholder = 'Type here...',
    ...props
}: EditorFieldProps) {
    // Create editor with markdown plugin
    const editor = usePlateEditor({
        plugins: [
            MarkdownPlugin,
        ],
        value: value ? (editor) => {
            // Deserialize markdown string to Plate value
            return editor.getApi(MarkdownPlugin).markdown.deserialize(value);
        } : [
            { type: 'p', children: [{ text: '' }] }, // Default empty paragraph
        ],
    });

    return (
        <Plate
            editor={editor}
            onChange={({ value }) => {
                // Serialize Plate value back to markdown string
                const markdown = editor.getApi(MarkdownPlugin).markdown.serialize({ value });
                onChange?.(markdown);
            }}
            {...props}
        >
            <PlateContent placeholder={placeholder} />
        </Plate>
    );
}
