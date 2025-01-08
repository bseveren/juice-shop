export const validateSinglePhone = async (phone: string, hostname: string) => {
  phone = phone.toString();
  const phoneOnDb = await Phones.findOne({ phone }).lean();
  if (phoneOnDb) {
    debugBase(`This phone number is already verified`);
    try {
      return sendRequest({
        url: `${hostname}/verifier/webhook`,
        method: "POST",
        body: {
          phone: { phone, status: phoneOnDb.status },
        },
      });
    } catch (e) {
      throw e;
    }
  }
  if (!phone.includes("+")) {
    //...
  }
};
