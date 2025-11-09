import { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';

import { getUserInfoMeGet } from '@/gen';

/**
 * Ensures the current user has admin role. Redirects to /decks if not.
 * Note: Basic auth (401) is already handled by the API interceptor in api-client.ts
 */
export async function requireAdmin(queryClient: QueryClient) {
    const user = await queryClient.ensureQueryData({
        queryKey: ['me'],
        queryFn: () => getUserInfoMeGet(),
        staleTime: 5 * 60 * 1000,
    });

    if (user?.data?.role !== 'admin') {
        throw redirect({
            to: '/decks',
        });
    }

    return user;
}

/**
 * Redirects to /review if the user is already authenticated.
 */
export async function redirectIfAuthenticated(queryClient: QueryClient) {
    try {
        const user = await queryClient.fetchQuery({
            queryKey: ['me'],
            queryFn: () => getUserInfoMeGet(),
            staleTime: 5 * 60 * 1000,
        });

        if (user?.data) {
            throw redirect({
                to: '/review',
            });
        }
    } catch (error) {
        if (error instanceof Error && 'to' in error) {
            throw error;
        }
    }
}
