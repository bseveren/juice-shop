const getCompanySettings: QueryResolvers["getCompanySettings"] = async (_, __, Context) => {
  const { currentBusinessAccountId: businessAccountId, PgDb, currentUserId, services } = Context;
  Context.businessAccess.ensureUserIsLoggedInForBusiness();
  const [businessAccess, businessAccessUser, business] = await Promise.all([
    PgDb.BusinessAccess.findOne({
      accountAccessId: currentUserId,
      businessAccountId,
      archived: isNotTrue,
    }),
    PgDb.BusinessAccessUser.findOne({
      accountAccessId: currentUserId,
      archived: isNotTrue,
      accountAccessRole: [BusinessAccessRole.CSM, BusinessAccessRole.SUPPORT_ENGINEER],
    }),
    PgDb.Business.findOne(businessAccountId),
  ]);
  if (!businessAccessUser || !businessAccess || !business) {
    throw new UnauthorisedError();
  }
  const signupLink = services.account.referrals.getReferralLink();
  return signupLink;
};
