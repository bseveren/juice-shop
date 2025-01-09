import { validateBulkPhones, validateSinglePhone } from "./apiPhoneVerifier";

// Use the explicitly typed middleware function
app.use(urlencodedMiddleware);
app.use(jsonMiddleware);
app.post("/verify-single", async (req, res, next) => {
  debugRequest(debugBase, req);
  const { email, phone, hostname } = req.body;
  if (email) {
    try {
      const result = await single(email, hostname);
      return res.json(result);
    } catch (e) {
      return next(new Error(e));
    }
  }
  try {
    const result = await validateSinglePhone(phone, hostname);
    return res.json(result);
  } catch (e) {
    return next(e);
  }
}); // Added the missing closing parenthesis and brace here
