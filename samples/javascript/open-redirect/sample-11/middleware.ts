async function handleRedirects(req: NextRequest, locale: string) {
  const { pathname } = req.nextUrl;

  const drupalRedirect = await fetchDrupalRedirect(pathname, locale);
  if (drupalRedirect) {
    return NextResponse.redirect(
      new URL(drupalRedirect.url, req.url),
      drupalRedirect.statusCode,
    );
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname === "/api/revalidate") {
    const secret = req.nextUrl.searchParams.get("secret");
    if (
      !secret ||
      secret !== process.env.PREVIEW_TOKEN ||
      req.method !== "POST"
    )
      return NextResponse.next();

    try {
      const tags = await req.json();
      // We need to maintain two cached lookups, one for middleware and one for the API route...
      for (const tag of tags) {
        if (tag === "maintenance_mode") {
          cachedMaintenanceMode = undefined;
        } else if (tag === "http_response") {
          cachedLookup.clear();
          cachedApplicationMeta.clear();
          cachedMaintenanceMode = undefined;
        } else {
          if (tag.startsWith("route_information:") && cachedLookup.has(tag)) {
            cachedLookup.delete(tag);
          } else if (tag === "membership_application_list") {
            cachedApplicationMeta.clear();
          } else if (
            tag.startsWith("membership_application:") &&
            cachedApplicationMeta.has(tag)
          ) {
            cachedApplicationMeta.delete(tag);
            return NextResponse.json(
              { revalidated: true, now: Date.now() },
              {
                headers: {
                  "Cache-Control": "private, no-store",
                },
              },
            );
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse JSON in revalidate request.", e);
    }

    return NextResponse.next();
  }

  const isMissingLocale = pathnameIsMissingLocale(pathname);
  const locale = isMissingLocale
    ? i18n.defaultLocale
    : getPathnameLocale(pathname)!;

  if (await isMaintenanceMode()) {
    return NextResponse.rewrite(
      new URL(`/${locale}/maintenance-mode`, req.url),
    );
  }

  if (
    [
      // Hard redirect from /en -> dynamic 404, otherwise layout breaks.
      "/en",
      // Disallow direct access to maintenance mode page.
      "/maintenance-mode",
      "/en/maintenance-mode",
    ].includes(pathname)
  ) {
    return redirectToNotFound(req);
  }

  const membershipRes = await handleMembershipFormRequest(req);
  if (membershipRes !== null) {
    return membershipRes;
  }

  // This is fucking dumb.
  // There is a taxonomy term route with the paths /en/faq and /fragor-och-svar in the CMS...
  if (pathname === "/en/faq" || pathname === "/sv/faq") {
    return NextResponse.next();
  }
  if (pathname === "/fragor-och-svar") {
    return NextResponse.rewrite(new URL("/sv/faq", req.url));
  }

  const redirect = await handleRedirects(req, locale);
  if (redirect) return redirect;

  const rewrite = await handleRewrites(req, locale);
  if (rewrite) return rewrite;

  if (isMissingLocale) {
    return NextResponse.rewrite(new URL(`/${locale}${pathname}`, req.url));
  } else if (locale === "sv") {
    return NextResponse.redirect(
      new URL(pathname.replace(`/${locale}`, ""), req.url),
    );
  }
}
