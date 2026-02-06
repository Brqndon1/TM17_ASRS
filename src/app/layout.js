/**
 * ============================================================================
 * ROOT LAYOUT — The outermost wrapper for the entire application.
 * ============================================================================
 * In Next.js App Router, layout.js wraps EVERY page. It sets up:
 * - The <html> and <body> tags
 * - Global metadata (page title, description for search engines)
 * - Any providers or wrappers that all pages need
 *
 * This file is a SERVER component (no "use client" needed) because it
 * doesn't use any browser-specific features like useState or onClick.
 * ============================================================================
 */

// Next.js built-in component for setting page metadata (title, description, etc.)
import './globals.css';

/**
 * Metadata object — Next.js uses this to set the <title> and <meta> tags
 * in the HTML <head>. This helps with SEO and browser tab titles.
 */
export const metadata = {
  title: 'ASRS Initiatives Reporting System',
  description: 'View and analyze reports for ASRS educational initiatives including E-Gaming, Drive Safe Robotics, ELA Achievement, and more.',
};

/**
 * RootLayout Component
 * This wraps every page in the application. The {children} prop represents
 * whatever page component is being rendered (in our case, page.js).
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Every page in the app gets rendered inside this <body> tag */}
        {children}
      </body>
    </html>
  );
}