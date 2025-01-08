const updateMyAccountDetails = async (__, { details }, Context) => {
  Context.checkUserLoggedIn();
  const {
    currentUserId,
    services: {
      postgres: { Customer },
    },
  } = Context;
  const lowercasedEmail = details.email?.toLowerCase();
  const lowercasedSecondaryEmail = details.secondaryEmail?.toLowerCase();
  const { error, value } = validator.validate({
    ...details,
    email: lowercasedEmail,
    secondaryEmail: lowercasedSecondaryEmail,
  });
  if (error) {
    throw new PublicValidationError(error);
  }
  if (lowercasedEmail) {
    const existingCustomer = await Customer.findOne({ email: lowercasedEmail });
    if (existingCustomer && currentUserId !== existingCustomer.customerId) {
      throw new InvalidEmailAddressError();
    }
  }
};
