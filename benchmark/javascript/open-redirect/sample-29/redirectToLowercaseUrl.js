export const redirectToLowercaseUrl = (url, res) => {
  if (isUpperCase(url)) {
    if (hasQueryString(url)) {
      res.redirect(301, `${getQueryString(url)[0].toLowerCase()}?${getQueryString(url)[1]}`);
    } else {
      res.redirect(301, url.toLowerCase());
    }

    return true;
  }

  return false;
};
