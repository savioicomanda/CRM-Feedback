import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { FirebaseProvider } from './components/FirebaseProvider';

export const metadata: Metadata = {
  title: 'The Culinary Ledger',
  description: 'Um CRM premium para gerentes de restaurantes',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}
