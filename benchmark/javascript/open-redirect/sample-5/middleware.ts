export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const url = req.nextUrl.clone();

  // Exclude static files and API routes
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;

  if(typeof maintenanceMode === "undefined") {
    return NextResponse.rewrite(new URL('/error', req.url))
  }

  if (typeof maintenanceMode !== "undefined" && maintenanceMode === 'true' && !req.nextUrl.pathname.startsWith('/Maintenance')) {
    url.pathname = '/Maintenance'
    return NextResponse.rewrite(url)
  }

  const token = await getToken({req});

  if(req.nextUrl.pathname.startsWith('/foo')) {
    return NextResponse.redirect(new URL('/bar', req.url));
  }

  const erInternPath = req.nextUrl.pathname.startsWith('/Intern')
  const erInternBruker = [Rolle.INTERN_BRUKER,  Rolle.INTERN_ADMIN].includes(token?.user?.rolle ?? Rolle.INGEN_ROLLE) || token?.user?.erEgentligIntern
  if (erInternPath && !erInternBruker) {
    return NextResponse.redirect(new URL('/bar', req.url));
  }

  const authMiddleware = await withAuth({
    pages: {
      signIn: '/signin'
    },
  });

  // @ts-expect-error because this is working
  return authMiddleware(req, event);
}
