'use client';

import { ColumnDef } from '@tanstack/react-table';

import { UserOut } from '@/gen';
import { formatDateForDisplay } from '@/lib/utils';

export const columns: ColumnDef<UserOut>[] = [
    {
        accessorKey: 'email',
        header: () => <div className="font-bold">Email</div>,
        cell: ({ row }) => {
            const email = row.original.email;
            return email ? (
                email
            ) : (
                <div className="text-muted-foreground italic">
                    No email registered
                </div>
            );
        },
    },
    {
        accessorKey: 'auth_provider',
        header: () => <div className="font-bold">Auth provider</div>,
    },
    {
        accessorKey: 'role',
        header: () => <div className="font-bold">Role</div>,
    },
    {
        accessorKey: 'created_at',
        header: () => <div className="font-bold">Member since</div>,
        cell: ({ row }) => {
            const created_at = row.original.created_at;
            return <div>{formatDateForDisplay(created_at)}</div>;
        },
    },
];
