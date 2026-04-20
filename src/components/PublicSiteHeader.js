'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Shared top bar for logged-out visitors (home + public pages like /reporting).
 * Matches homepage: brand left, optional page title, Home + Log in on the right.
 */
export default function PublicSiteHeader({ pageTitle = null }) {
  const pathname = usePathname();
  const showHome = pathname !== '/';

  return (
    <header className="public-site-header">
      <div className="public-site-header-inner">
        <Link href="/" className="public-site-brand" aria-label="ASRS home">
          <img src="/asrs-logo.png" alt="ASRS" width={36} height={36} className="public-site-brand-logo" />
          <span className="public-site-brand-text">ASRS</span>
          {pageTitle ? (
            <>
              <span className="public-site-header-sep" aria-hidden="true" />
              <span className="public-site-header-title">{pageTitle}</span>
            </>
          ) : null}
        </Link>
      </div>
      <div className="public-site-header-actions">
        {showHome ? (
          <Link href="/" className="public-site-header-link">
            Home
          </Link>
        ) : null}
        <Link href="/login" className="btn-outline public-site-header-login">
          Log in
        </Link>
      </div>
    </header>
  );
}
