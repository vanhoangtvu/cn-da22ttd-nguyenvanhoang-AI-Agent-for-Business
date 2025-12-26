'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group relative overflow-hidden"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
            <div className="relative w-5 h-5">
                {/* Sun icon for dark mode (show sun to switch to light) */}
                <Sun
                    className={`absolute inset-0 w-5 h-5 text-yellow-400 transition-all duration-300 ${theme === 'dark'
                        ? 'rotate-0 scale-100 opacity-100'
                        : 'rotate-90 scale-0 opacity-0'
                        }`}
                />
                {/* Moon icon for light mode (show moon to switch to dark) */}
                <Moon
                    className={`absolute inset-0 w-5 h-5 text-blue-300 transition-all duration-300 ${theme === 'light'
                        ? 'rotate-0 scale-100 opacity-100'
                        : '-rotate-90 scale-0 opacity-0'
                        }`}
                />
            </div>
        </button>
    );
}
