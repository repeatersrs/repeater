import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * A decorative grid of individual dots, rendered as SVG `<circle>` nodes so
 * each dot is a real DOM element. This makes it cheap today (SVG renders a
 * flat list of circles on the GPU) but future-ready for per-dot interactions —
 * ripples from a click, proximity to the cursor, scroll-parallax, etc.
 *
 * Tune the field with `spacing` (grid pitch, px) and `radius` (dot size, px).
 * Color is driven off `currentColor` so Tailwind text utilities control it
 * (e.g. `text-destructive/8`).
 */
export interface DotFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Grid pitch in px. Lower = tighter. */
    spacing?: number;
    /** Dot radius in px. */
    radius?: number;
    /**
     * Optional inset (px) for the first/last dot from the container edges.
     * Defaults to `spacing / 2` so dots sit in the middle of each cell.
     */
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
