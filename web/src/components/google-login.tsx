import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

type Props = {
    children?: React.ReactNode;
};

export default function GoogleLogin({ children }: Props) {
    const apiURL = import.meta.env.VITE_API_URL;

    if (!apiURL) return <Skeleton className="h-8 w-36 rounded-md" />;

    const googleOAuthURL = new URL('/oauth/login', apiURL).toString();

    return (
        <a
            href={googleOAuthURL}
            target="_self"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium shadow-sm"
        >
            <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 533.5 544.3"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M533.5 278.4c0-17.4-1.6-34.1-4.7-50.4H272v95.4h146.9c-6.4 34.6-25.7 63.9-54.9 83.6v69.2h88.7c51.9-47.8 81.8-118 81.8-197.8z"
                    fill="#4285f4"
                />
                <path
                    d="M272 544.3c73.6 0 135.5-24.4 180.7-66.4l-88.7-69.2c-24.6 16.5-56.2 26.3-92 26.3-70.8 0-130.8-47.8-152.4-112.2H28.3v70.7C74.8 486.9 167.3 544.3 272 544.3z"
                    fill="#34a853"
                />
                <path
                    d="M119.6 323.4c-5.6-16.7-8.8-34.5-8.8-52.7s3.2-36 8.8-52.7v-70.7H28.3c-18.1 35.8-28.3 76.1-28.3 123.4s10.2 87.6 28.3 123.4l91.3-70.7z"
                    fill="#fbbc04"
                />
                <path
                    d="M272 107.7c39.8 0 75.4 13.7 103.5 40.6l77.7-77.7C406.9 24.1 344.9 0 272 0 167.3 0 74.8 57.4 28.3 143.4l91.3 70.7c21.6-64.4 81.6-112.2 152.4-112.2z"
                    fill="#ea4335"
                />
            </svg>
            {children || 'Sign in with Google'}
        </a>
    );
}
