import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Decorative grid of dots rendered as individual SVG `<circle>` nodes so each
 * dot is addressable for per-dot effects (ripple, cursor proximity, etc.).
 * Color follows `currentColor`.
 */
export interface DotFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    spacing?: number;
    radius?: number;
    inset?: number;
}

export function DotField({
    spacing = 16,
    radius = 1,
    inset,
    className,
    ...props
}: DotFieldProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setSize({ w: Math.ceil(width), h: Math.ceil(height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const offset = inset ?? spacing / 2;

    const dots = useMemo(() => {
        if (size.w === 0 || size.h === 0) return [];
        const cols = Math.max(0, Math.floor((size.w - offset) / spacing) + 1);
        const rows = Math.max(0, Math.floor((size.h - offset) / spacing) + 1);
        const list: { key: string; cx: number; cy: number }[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                list.push({
                    key: `${r}-${c}`,
                    cx: offset + c * spacing,
                    cy: offset + r * spacing,
                });
            }
        }
        return list;
    }, [size.w, size.h, spacing, offset]);

    return (
        <div
            ref={ref}
            aria-hidden
            className={cn(
                'pointer-events-none absolute inset-0 overflow-hidden',
                className
            )}
            {...props}
        >
            {size.w > 0 && size.h > 0 && (
                <svg
                    width={size.w}
                    height={size.h}
                    viewBox={`0 0 ${size.w} ${size.h}`}
                    className="absolute inset-0"
                >
                    {dots.map((d) => (
                        <circle
                            key={d.key}
                            cx={d.cx}
                            cy={d.cy}
                            r={radius}
                            fill="currentColor"
                        />
                    ))}
                </svg>
            )}
        </div>
    );
}
