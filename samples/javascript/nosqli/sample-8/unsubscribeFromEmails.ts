const Joi = require("joi");

const unsubscribeFromEmails = async (_, request, Context) => {
  try {
    const email = request.params.email;
    const { error, value } = Joi.string().email({ allowUnicode: false }).validate(email);
    if (error) {
      return true;
    }
    const customer = await Context.services.mongo.Customer.findOne({
      email: value,
    });
    if (!customer) {
      return true;
    }
    await Context.services.apis.marketing.setUserProps({
      userId: customer.customerId,
      unsubscribeChannelsToAdd: ["Email"],
    });
    return true;
  } catch (e) {
    return true;
  }
};
