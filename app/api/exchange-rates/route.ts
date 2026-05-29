import { NextResponse } from 'next/server';

// Proxy to frankfurter.app so the browser doesn't hit SSL cert issues
// NODE_TLS_REJECT_UNAUTHORIZED=0 is active server-side
export async function GET() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD', {
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!res.ok) throw new Error(`Upstream error: ${res.status}`);

    const data = await res.json();

    // ECB doesn't track currencies pegged to USD (e.g. AED) — hardcode those first
    // then merge real ECB rates on top so they override if present
    const rates = {
      USD: 1,
      AED: 3.6725,  // pegged to USD since 1997
      PHP: 56.5,    // ECB may omit this — hardcode as fallback
      ...data.rates, // real ECB rates override the defaults above
    };

    return NextResponse.json({ rates }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (err) {
    console.error('Exchange rates fetch failed:', err);
    // Return fallback rates so the app keeps working
    return NextResponse.json({
      rates: { USD: 1, AED: 3.6725, EUR: 0.92, GBP: 0.79, SGD: 1.35, PHP: 56.5, JPY: 155, AUD: 1.55, CAD: 1.38 },
    });
  }
}
