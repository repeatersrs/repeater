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
import { registerAuthRegisterPost, UserCreate } from '@/gen';

export default function Register() {
    const queryClient = useQueryClient();
    const router = useRouter();

    const registerFormSchema = z.object({
        email: z.string().email(),
        password: z.string(),
    }) satisfies z.ZodType<UserCreate>;

    const registerForm = useForm<z.infer<typeof registerFormSchema>>({
        resolver: zodResolver(registerFormSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const registerMutation = useMutation({
        mutationFn: (values: z.infer<typeof registerFormSchema>) =>
            registerAuthRegisterPost({
                body: values,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            queryClient.invalidateQueries({ queryKey: ['decks'] });
            registerForm.reset();
            router.push('/review');
        },
    });

    return (
        <div>
            <div className="flex items-center justify-center gap-4">
                <Form {...registerForm}>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={registerForm.handleSubmit((data) =>
                            registerMutation.mutate(data)
                        )}
                    >
                        <FormField
                            control={registerForm.control}
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
                            control={registerForm.control}
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
                        {registerMutation.isError && (
                            <FormMessage>
                                {/* TODO handle errors better */}
                                {/* eslint-disable @typescript-eslint/no-explicit-any */}
                                {(registerMutation.error as any)?.detail ||
                                    'Register failed'}
                            </FormMessage>
                        )}
                        <Button
                            type="submit"
                            disabled={registerMutation.isPending}
                        >
                            Register
                        </Button>
                    </form>
                </Form>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
                <a
                    href="/login"
                    className="color-primary whitespace-nowrap hover:underline"
                >
                    Log In
                </a>
                <div className="h-5 w-px bg-gray-300" />
                <GoogleLogin />
            </div>
        </div>
    );
}
