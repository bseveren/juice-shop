const handler: NextApiHandler = async (req, res) => {
  try {
    const parsedQuery = slackActionQuery.parse(req.query);
    const redirectUrl = new URL(parsedQuery.redirect);

    const session = await getServerAuthSession({ req, res });
    if (!!session?.user?.organisationId && session?.user?.organisationId === parsedQuery.organisationId) {
      const loggedInUrl = new URL(
        `https://${(process.env.ROOMS_DOMAIN_URL || "rooms.***.io").replace(/http[s]?:\/\//, "")}/rooms/${
          parsedQuery.roomId
        }`
      );

      // copy over search params
      loggedInUrl.search = redirectUrl.search;
      return res.redirect(loggedInUrl.toString());
    }

    return res.redirect(parsedQuery.redirect);
  } catch (e) {
    return res.redirect(
      `https://${(process.env.ROOMS_DOMAIN_URL || "rooms.***.io").replace(/http[s]?:\/\//, "")}/login`
    );
  }
};
