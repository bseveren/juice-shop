export const getTemplate = async ({
  templateId,
  jobData,
  language = "en",
  uniqueMailId,
  customerId,
  resellerId,
}: any) => {
  try {
    let template;
    resellerId ??= (await resellerController.findByName("***"))._id;
    if (customerId) {
      const customer = await customerController.findById(customerId);
      resellerId = await resellerController.findById(customer?.seller);
      resellerId ??= await resellerController.findByName("***");
      template = await getCustomerTemplate(customerId, templateId, language);
      if (!template) {
        template = await htmlTemplate.findOne({
          seller: resellerId,
          templateId: templateId,
          language: language,
          deleted: false,
        });
      }
    } else {
      template = await htmlTemplate.findOne({
        seller: resellerId,
        templateId: templateId,
        language: language,
        deleted: false,
      });
    }

    //If the function found a template it will include the tracking pixel and run the jobData through the handlebars compiler
    //to fill corresponding fields in the template, and then return a full HTML string to be used in the mail
    if (!template) {
      logger.error(
        `No template was found with Id: ${templateId} and language: ${language}`,
      );
      throw errors.NOT_FOUND(
        `No template was found with Id: ${templateId} and language: ${language}`,
      );
    }

    template.htmlBody = Buffer.from(template.htmlBody, "base64").toString(
      "utf8",
    );
    jobData.trackingUrl = `${process.env.API_BASE_URL}/email/v1/events/opened?mailId=${uniqueMailId}`;

    const templateData = Handlebars.compile(template.htmlBody);

    if (!templateData(jobData)) {
      logger.error(
        "templateData is null due to an error when compiling the template htmlBody",
      );
    }
    return templateData(jobData);
  } catch (err) {
    logger.error(
      `No template was found with Id: ${templateId} and language: ${language}`,
      err,
    );
    throw errors.NOT_FOUND(
      `No template was found with Id: ${templateId} and language: ${language}`,
    );
  }
};
