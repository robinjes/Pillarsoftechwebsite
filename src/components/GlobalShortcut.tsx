'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalShortcut() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const activeElement = document.activeElement;
      const isInput = activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName);
      if (isInput) return;

      // Check for Ctrl/Cmd + Shift + A
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        sessionStorage.setItem('admin_access_time', Date.now().toString());
        router.push('/admin/login');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return null; // This component doesn't render anything
}
