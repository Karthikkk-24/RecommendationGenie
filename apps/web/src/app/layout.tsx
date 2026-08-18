import type { Metadata } from 'next';
import { Fraunces, Outfit } from 'next/font/google';
import { Providers } from '../components/providers';
import './globals.css';

const display = Outfit({ subsets: ['latin'], variable: '--font-display' });
const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Recommendation Genie',
  description: 'Tell Genie what you love. Genie learns your taste and finds what you’ll love next.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
