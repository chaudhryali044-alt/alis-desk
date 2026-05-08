import type { Metadata } from 'next';
import { Playfair_Display, Space_Mono, DM_Sans } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '700'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pulse by Ali Chaudhry — Financial Intelligence',
  description: 'Real-time deal flow, market intelligence, and AI-powered analysis for finance professionals.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📈</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var t=localStorage.getItem('theme');
              if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}
              else{document.documentElement.classList.add('dark');}
              var a=localStorage.getItem('accent');
              if(a&&a!=='gold'){document.documentElement.setAttribute('data-accent',a);}
            }catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${playfair.variable} ${spaceMono.variable} ${dmSans.variable}`}>
        {children}
      </body>
    </html>
  );
}
