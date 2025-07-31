'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from './actions';

export default function AdminGreeter() {
    const router = useRouter();

    useEffect(() => {
        let ignore = false;
        async function check() {
            const res = await isLoggedIn();
            if (ignore) return;
            if (res.success) {
                router.replace('/admin/dashboard');
            } else {
                router.replace('/admin/login');
            }
        }
        check();
        return () => { ignore = true; };
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded shadow-md">
                <div className="text-lg font-semibold mb-2">Checking admin authentication...</div>
                <div className="text-gray-500 text-sm">Please wait.</div>
            </div>
        </div>
    );
}