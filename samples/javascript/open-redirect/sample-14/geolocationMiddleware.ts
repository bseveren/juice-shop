import { prefixLocaleMiddleware } from "./prefixLocaleMiddleware";

export const geolocationMiddleware = async (req: NextRequest) => {
  const requestHeaders = new Headers(req.headers);
  const headersWithCSP = addCspHeaders(requestHeaders);

  const options =
    process.env.NODE_ENV === "development"
      ? null
      : {
          // Add CSP headers to request headers to let our app know about
          // the nonce.
          request: {
            headers: headersWithCSP,
          },
        };

  const res = NextResponse.next(options);

  // Add CSP to response headers.
  if (process.env.NODE_ENV !== "development") {
    addCspHeaders(res.headers);
  }

  const { geoConfig } = siteConfig;

  if (geoConfig) {
    // Geo middleware should work only on specific paths
    if (siteConfig.geoConfig.paths.includes(req.nextUrl.pathname)) {
      let preferredLocale = req.cookies.get("NEXT_LOCALE")?.value;

      if (!preferredLocale || !siteConfig.locales.includes(preferredLocale)) {
        try {
          let ip = req.ip ?? req.headers.get("x-real-ip");
          const forwardedFor = req.headers.get("x-forwarded-for");
          if (!ip && forwardedFor) {
            ip = forwardedFor.split(",").at(0) ?? null;
          }

          const headersAuthorization = req.headers.get("authorization");
          const responseGeo = await fetch(
            `${process.env.NEXT_PUBLIC_NEXT_FRONTEND_URL}/api/geo?ip=${ip}`,
            {
              method: "GET",
              ...(headersAuthorization && {
                headers: {
                  authorization: headersAuthorization,
                },
              }),
            }
          );
          const geo = await responseGeo.json();

          if (geo?.country) {
            const countryConfig = geoConfig.countries.find(
              (country) => country.code === geo.country
            );
            if (countryConfig) {
              preferredLocale = countryConfig.locale;
            } else {
              preferredLocale = siteConfig.defaultLocale;
            }

            const newUrl = new URL(
              `/${preferredLocale}${stripTrailingSlash(req.nextUrl.pathname)}${
                req.nextUrl.search
              }`,
              req.url
            ).toString();

            if (newUrl !== req.url) {
              const redirectResponse = NextResponse.redirect(newUrl);
              const expires = new Date(
                new Date().setFullYear(new Date().getFullYear() + 1)
              );
              redirectResponse.cookies.set("NEXT_LOCALE", preferredLocale!, {
                httpOnly: false,
                expires,
              });

              return redirectResponse;
            }
          }
        } catch (e) {
          console.error(`Error geolocationMiddleware ${e.message}`);
        }
      }
    }
  }

  return prefixLocaleMiddleware(req, res);
};
