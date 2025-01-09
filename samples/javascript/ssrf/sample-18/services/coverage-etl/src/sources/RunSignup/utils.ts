export const generateOrganizerNameFromExternalUrl = async (
  externalRaceUrl: string,
): Promise<string | undefined> => {
  // retrieve organizer name from page
  let res;
  let organizerName;
  let scrapeSuccess = true;
  try {
    res = await fetch(externalRaceUrl);
  } catch {
    // if we can't fetch the page, continue and fallback to hostname
    scrapeSuccess = false;
  }

  if (scrapeSuccess && res) {
    // TODO: Ensure there's no redirects
    const html = await res.text();
    const $ = load(html);
    if (externalRaceUrl.includes('facebook.com')) {
      organizerName = $('meta[property="og:title"]').attr('content');
    } else {
      organizerName = $('meta[property="og:site_name"]').attr('content');
    }
  }

  const isScrapedNameValid =
    organizerName && isExtractedOrganizerNameValid(organizerName);

  // fallback to hostname if organizer name is missing or invalid
  if (!organizerName || !isScrapedNameValid) {
    const hostName = new URL(externalRaceUrl).hostname;
    organizerName = capitalize(getKeySubdomain(hostName));
  }

  const isHostnameValid =
    organizerName && isExtractedOrganizerNameValid(organizerName);

  return isHostnameValid
    ? cleanUpTrailingPunctuation(organizerName)
    : undefined;
};
