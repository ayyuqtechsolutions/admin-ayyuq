import './globals.css';
import { Inter } from 'next/font/google';
import { DataProvider } from '@/context/DataContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Shell from '@/components/Shell';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
export const metadata = { title: 'Ayyuq Admin' };

// Applies the saved theme before first paint (no white flash)
const themeScript = `(function(){try{var t=localStorage.getItem('ayyuq-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={`${inter.className} text-[#111827] antialiased`}>
        <ThemeProvider><AuthProvider><DataProvider><Shell>{children}</Shell></DataProvider></AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
