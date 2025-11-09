import { refreshTokenAuthRefreshPost } from '@/gen';
import { client } from '@/gen/client.gen';

let isRefreshing = false;

client.setConfig({
    baseUrl: import.meta.env.VITE_API_URL,
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
