import {
  getTemplate,
  getHtmlTemplateById,
  getCustomerTemplate,
} from "../HtmlTemplate/htmlTemplate";

export const send = async (eventRequest: SendEventRequestDto) => {
  let uniqueMailId = uuidv4();
  let language = eventRequest.jobData.templateLanguage
    ? eventRequest.jobData.templateLanguage.toLowerCase()
    : "en";
  // currently only danish and english emails are supported so if the language is not danish or english it will default to english
  if (language !== "da" && language !== "en" && language !== "nl") {
    language = "en";
  }

  let _customerId =
    eventRequest.user?.customer || eventRequest.customerId || null;
  let kycCase = null;
  if (!_customerId) {
    if (eventRequest.caseId) {
      kycCase = await fetchKycCase(eventRequest.caseId);
      if (kycCase) {
        _customerId = kycCase.***Customer;
      }
    }
    if (eventRequest.entityId && !kycCase) {
      kycCase = await fetchKycCase(eventRequest.entityId);
      if (kycCase) {
        _customerId = kycCase.***Customer;
      }
    }

    if (!_customerId && eventRequest.userId) {
      const user = await fetchUser(eventRequest.userId);
      if (user) {
        _customerId = user.customer;
      }
    }

    if (!_customerId && eventRequest.senderEmail) {
      const user = await fetchUser(eventRequest.senderEmail);
      if (user) {
        _customerId = user.customer;
      }
    }
  }
  // FETCH CUSTOMER
  const customerData = await fetchCustomerBaseInfo(_customerId);
  if (customerData?.deactivate) {
    logger.info(
      `Customer is deactivated, email not sent => ${eventRequest.to}`,
      eventRequest,
    );
    return;
  }

  let htmlTemplate;
  let reseller = await resellerController.findByName("***");
  if (_customerId) {
    reseller = await resellerController.findByName(
      customerData?.resellerCompany?.internal_name_key ??
        reseller.internal_name_key,
    );
    htmlTemplate = await getCustomerTemplate(
      _customerId,
      eventRequest.templateId,
      language,
    );
  } else {
    if (!customerData) {
      reseller = await resellerController.findByName("***");
      htmlTemplate = await getHtmlTemplateById(
        reseller._id,
        eventRequest.templateId,
        language,
      );
    } else {
      reseller = await resellerController.findByName(
        customerData?.resellerCompany?.internal_name_key ??
          reseller.internal_name_key,
      );
      htmlTemplate = await getHtmlTemplateById(
        customerData?.resellerCompany?._id,
        eventRequest.templateId,
        language,
      );
    }
  }
  // Check if email is fictive and if it is, don't send it
  if (checkFictiveEmail(eventRequest.to as string)) {
    logger.info("Prevented fictive email from being sent", eventRequest);
    return;
  }

  const isEmailSuppressed = await checkEmailSuppressed(
    eventRequest.to as string,
  );
  if (isEmailSuppressed) {
    console.log(
      `Email is suppressed, email not sent => ${eventRequest.to}`,
      eventRequest,
    );
    logger.info(
      `Email is suppressed, email not sent => ${eventRequest.to}`,
      eventRequest,

  const templateData = await getTemplate({
    templateId: eventRequest.templateId,
    jobData: eventRequest.jobData,
    language,
    uniqueMailId,
    customerId: _customerId,
    resellerId: customerData?.resellerCompany?._id ?? reseller!._id,
  });
