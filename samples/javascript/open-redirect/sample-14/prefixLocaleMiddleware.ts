export const prefixLocaleMiddleware = async (
  req: NextRequest,
  res: NextResponse
) => {
  if (
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.includes("/api/") ||
    PUBLIC_FILE.test(req.nextUrl.pathname)
  ) {
    return res;
  }

  let locale = req.cookies.get("NEXT_LOCALE")?.value;
  if (!locale || !siteConfig.locales.includes(locale)) {
    locale = siteConfig.defaultLocale;
  }

  if (
    // Locale "default" is meant to be redirected to preffered or default locale
    req.nextUrl.locale === "default" ||
    // If the pathname ends with trailing shash, redirect to path without it
    (req.nextUrl.pathname &&
      req.nextUrl.pathname != "/" &&
      req.nextUrl.pathname.endsWith("/"))
  ) {
    return NextResponse.redirect(
      new URL(
        `/${locale}${stripTrailingSlash(req.nextUrl.pathname)}${
          req.nextUrl.search
        }`,
        req.url
      ),
      301
    );
  }

  /**
   * If url starts with double locale values (e.g. /de/en) it leads to error 500:
   * /project/node_modules/next/dist/server/future/helpers/i18n-provider.js (70:27)
   *
   * It's a known bug in nextjs
   * https://github.com/vercel/next.js/issues/52314
   * https://github.com/vercel/next.js/issues/65167
   *
   * Check for double locale in url, log the error, but show page not found 404 instead of error 500 page.
   */
  const fullPathname = new URL(req.url).pathname;
  for (const siteConfigLocale of siteConfig.locales) {
    if (
      fullPathname === `/${locale}/${siteConfigLocale}` ||
      fullPathname.startsWith(`/${locale}/${siteConfigLocale}/`)
    ) {
      console.error("Error: double locale in url.", req.url);

      return NextResponse.redirect(new URL(`/${locale}/404`, req.url));
    }
  }

  return res;
};
