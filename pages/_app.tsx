/**
 * Next.js App Component
 * 
 * Global app wrapper with Tailwind CSS styles.
 */

import '@/styles/globals.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

