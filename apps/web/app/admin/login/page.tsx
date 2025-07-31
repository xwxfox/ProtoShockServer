'use client';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '../actions';

export default function AdminLogin() {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        async (prevState: { success: boolean | null; error?: string }, formData: FormData) => {
            const res = await loginAdmin(formData);
            if (res.success) {
                router.replace('/admin/dashboard');
            }
            return { success: res.success, error: res.error ?? undefined };
        },
        { success: null, error: undefined }
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <form
                action={formAction}
                className="p-8 bg-white rounded shadow-md w-80 flex flex-col gap-4"
                autoComplete="off"
            >
                <h1 className="text-2xl font-bold mb-2 text-center">Admin Login</h1>
                <input
                    type="password"
                    name="password"
                    placeholder="Admin password"
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                />
                {state?.error && (
                    <div className="text-red-500 text-sm text-center">{state.error}</div>
                )}
                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
                    disabled={pending}
                >
                    {pending ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}