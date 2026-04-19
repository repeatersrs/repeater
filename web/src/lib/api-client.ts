import { refreshTokenAuthRefreshPost } from '@/gen';
import { client } from '@/gen/client.gen';
import { apiUrl } from '@/lib/api-url';

let isRefreshing = false;

client.setConfig({
    baseUrl: apiUrl,
});

client.interceptors.response.use(
    async (response: Response, request: Request) => {
        if (response.status === 401 && !isRefreshing) {
            isRefreshing = true;
            try {
                const refreshResponse = await refreshTokenAuthRefreshPost();

                if (refreshResponse.response && !refreshResponse.response.ok) {
                    window.location.replace('/login');
                    throw new Error('Refresh error');
                }

                return await fetch(request.clone());
            } catch (refreshError) {
                window.location.replace('/login');
                throw refreshError;
            } finally {
                isRefreshing = false;
            }
        }
        return response;
    }
);
