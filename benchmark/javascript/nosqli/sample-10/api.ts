export const single = async (email: string, hostname: string) => {
  const MAIL_VERIFIER_SERVICE = getEnv({
    name: "MAIL_VERIFIER_SERVICE",
    defaultValue: "mailsso",
  });

  email = email.toString();

  if (!isValidEmail(email)) {
    debugBase(`This email is not valid`, email);
    return { email, status: EMAIL_VALIDATION_STATUSES.INVALID };
  }

  if (!isValidDomain(email)) {
    debugBase(`This domain is not valid`, email);
    return { email, status: EMAIL_VALIDATION_STATUSES.INVALID };
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const emailOnDb = await Emails.findOne({
    email,
    verifiedAt: { $gt: oneMonthAgo },
  });

  // ...
};
