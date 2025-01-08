const countryRedirect = async (req: $Request, res: $Response, next: NextFunction) => {
  const { path, hostname, language } = req
  const { jobseekerUrl } = config.linking
  const country = getAlternativeDomainCountry(hostname)

  if (country && process.env.CONFIG_ENV === 'production') {
    return res.redirect(301, `${jobseekerUrl}/${language}-${country}`)
  }

  const countryFromCookie = req.universalCookies.get(cookies.identifiers.PREFERRED_COUNTRY)
  const isValidCountryCookie = countryFromCookie && config.countries.available.includes(countryFromCookie)

  if (path === '/' && isValidCountryCookie) {
    return res.redirect(301, `/${language}-${countryFromCookie}`)
  }

  const countryFromPath = getCountryFromPath(
    path,
    config.countries.available
  )

  if (REDIRECTED_COUNTRIES.includes(countryFromPath)) {
    return res.redirect(301, `/${language}-${DEFAULT_COUNTRY_OPTION}`)
  }

  next()
}
