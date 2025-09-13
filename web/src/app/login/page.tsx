'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import GoogleLogin from '@/components/google-login';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { loginAuthLoginPost, UserLogin } from '@/gen';

export default function Login() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const googleOAuthURL = new URL(
        '/oauth/login',
        process.env.NEXT_PUBLIC_API_URL!
    ).toString();

    const loginFormSchema = z.object({
        email: z.string().email(),
        password: z.string(),
    }) satisfies z.ZodType<UserLogin>;

    const loginForm = useForm<z.infer<typeof loginFormSchema>>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const loginMutation = useMutation({
        mutationFn: (values: z.infer<typeof loginFormSchema>) =>
            loginAuthLoginPost({
                body: values,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            queryClient.invalidateQueries({ queryKey: ['decks'] });
            loginForm.reset();
            router.push('/review');
        },
    });

    return (
        <div>
            <div className="flex items-center justify-center gap-4">
                <Form {...loginForm}>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={loginForm.handleSubmit((data) =>
                            loginMutation.mutate(data)
                        )}
                    >
                        <FormField
                            control={loginForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">
                                        Email
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="Email"
                                            className="w-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">
                                        Password
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="Password"
                                            className="w-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {loginMutation.isError && (
                            <FormMessage>
                                {/* TODO handle errors better */}
                                {/* eslint-disable @typescript-eslint/no-explicit-any */}
                                {(loginMutation.error as any)?.detail ||
                                    'Login failed'}
                            </FormMessage>
                        )}
                        <Button
                            type="submit"
                            disabled={loginMutation.isPending}
                        >
                            Sign In
                        </Button>
                    </form>
                </Form>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
                <a
                    href="/register"
                    className="color-primary whitespace-nowrap hover:underline"
                >
                    Register
                </a>
                <div className="h-5 w-px bg-gray-300" />
                <GoogleLogin href={googleOAuthURL} />
            </div>
        </div>
    );
}
