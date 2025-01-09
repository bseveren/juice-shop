import { geolocationMiddleware } from "./geolocationMiddleware";

export const redirectMiddleware = async (req: NextRequest) => {
  const isPreviewMode =
    !!req.cookies.get("__prerender_bypass")?.value &&
    !!req.cookies.get("__next_preview_data")?.value;

  // Test if path is a redirect
  if (
    !isPreviewMode &&
    !req.nextUrl.pathname.startsWith("/_next") &&
    !req.nextUrl.pathname.includes("/api/") &&
    // Public files
    // We cant use !PUBLIC_FILE.test(req.nextUrl.pathname) here as redirects might have extensions like .aspx
    !req.nextUrl.pathname.startsWith("/sites/") &&
    !req.nextUrl.pathname.startsWith("/fonts/") &&
    !req.nextUrl.pathname.startsWith("/assets/") &&
    req.nextUrl.pathname != "/robots.txt" &&
    req.nextUrl.pathname != "/footer-gradient-dots.svg"
  ) {
    const currentLocale =
      req.nextUrl.locale == "default"
        ? req.cookies.get("NEXT_LOCALE")?.value || siteConfig.defaultLocale
        : req.nextUrl.locale;

    try {
      const headersAuthorization = req.headers.get("authorization");
      const site_redirects_response = await fetch(
        `${process.env.NEXT_PUBLIC_NEXT_FRONTEND_URL}/api/site-redirects`,
        {
          method: "GET",
          ...(headersAuthorization && {
            headers: {
              authorization: headersAuthorization,
            },
          }),
        }
      );
      const site_redirects = await site_redirects_response.json();

      const path = decodeURI(`${req.nextUrl.pathname}${req.nextUrl.search}`);

      // Check if the path without trailing slash matches redirect
      let pathWithoutTrailingSlash = null;
      if (req.nextUrl.pathname.endsWith("/")) {
        pathWithoutTrailingSlash = decodeURI(
          `${req.nextUrl.pathname.slice(0, -1)}${req.nextUrl.search}`
        );
      }

      // Search exact match
      let matching_redirects = site_redirects.filter(
        (site_redirect) =>
          site_redirect.from == path ||
          (pathWithoutTrailingSlash &&
            site_redirect.from == pathWithoutTrailingSlash)
      );

      // Query args not added on exact match, only when stripping for search.
      let add_query_args = false;

      // Search match without arguments, append arguments to redirect.
      // Avoid 404 when utm_sorce and the like.
      if (!matching_redirects.length && req.nextUrl.search.length) {
        add_query_args = true;
        const path_without_args = decodeURI(req.nextUrl.pathname);
        matching_redirects = site_redirects.filter((site_redirect) => {
          return site_redirect.from == path_without_args;
        });
      }

      if (matching_redirects.length) {
        const matching_redirect_with_locale = matching_redirects.find(
          (matching_redirect) => matching_redirect.langcode == currentLocale
        );

        // Follow the redirect if it matches the current locale, or current locale is "default".
        // Do not follow if they are different and current locale is specified.

        const redirect = matching_redirect_with_locale
          ? matching_redirect_with_locale
          : currentLocale == "default"
            ? matching_redirects[0]
            : null;

        if (redirect) {
          let to_url;
          try {
            // Support absolute URL redirects, starts with http
            if (redirect.to.startsWith("http")) {
              to_url = new URL(redirect.to);
            }
            // Relative redirects starts with /
            else {
              to_url = new URL(`/${redirect.langcode}${redirect.to}`, req.url);
            }

            if (add_query_args) {
              req.nextUrl.searchParams.forEach((val, key) => {
                to_url.searchParams.set(key, val);
              });
            }

  return geolocationMiddleware(req);
