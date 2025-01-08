async function deleteAuth0User(context, req, accessToken) {
  const auth0Domain = process.env.AUTH0_DOMAIN;
  if (!auth0Domain) {
    throw new Error("AUTH0 domain is not configured.");
  }
  const url = `https://${auth0Domain}/api/v2/users/${req.body.deleteUser}`;
  // Validate the domain and the IP address of the resolved hostname
  await validateDomain(url);
  const config = {
    headers: { Authorization: `Bearer ${accessToken}` },
    maxRedirects: 0,
  };
  try {
    const response = await axios.delete(url, config);
    // Validate the response status
    if (response.status === 204) {
      context.log(`Successfully deleted user with ID: ${req.body.deleteUser}`);
      return true;
    } else {
      context.log.warn(
        `Unexpected response when deleting user ${req.body.deleteUser}:`,
        response.data
      );
      return false;
    }
  } catch (error) {
    context.log.error("Error deleting Auth0 user", error);
    return false;
  }
}
