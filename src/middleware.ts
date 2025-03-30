import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Logg alle forespørsler for debugging
  console.log('Middleware: Håndterer forespørsel til:', pathname);

  // Håndter API-ruter
  if (pathname.startsWith('/api/')) {
    console.log('Middleware: Håndterer API-rute');
    // Returner forespørselen som den er, men logg den
    return NextResponse.next();
  }

  // For alle andre ruter, fortsett som normalt
  return NextResponse.next();
}

// Konfigurer hvilke ruter som skal gå gjennom middleware
export const config = {
  matcher: [
    // Matcher alle API-ruter
    '/api/:path*',
  ],
}; 