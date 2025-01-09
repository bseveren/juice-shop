async function createSession(ENDPOINT, { username, encryptedPassword }) {
  const { sessionEndpoint } = ul360endpoints(ENDPOINT);
  let password = await decryptPassword(encryptedPassword)
  try {
    const response = await axios.post(sessionEndpoint, null, {
      params: { username, password },
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status !== 200) {
      throw new Error('Failed to create session');
    }

    return response.headers['set-cookie'];
  } catch (error) {
    throw new Error(`Session Creation Error: ${error.message}`);
  }
}

async function sendEventToUL360(ENDPOINT, eventData, INTEGRATION_META) {
  try {
    const { username, password, formId } = INTEGRATION_META;
    
    let encryptedPassword = password
    // Step 1: Create Session and Extract Cookies
    const setCookieHeader = await createSession(ENDPOINT, { username , encryptedPassword});
    const { cookies, sxsrf } = extractCookies(setCookieHeader);
    // Step 2: Retrieve Form Details
    const formDetails = await getFormDetails(ENDPOINT, formId, cookies, sxsrf);
    
    // Step 3: Build and Submit Form Data
    const formData = buildFormData(INTEGRATION_META, eventData, formDetails);
    const submissionStatus = await submitFormResponse(ENDPOINT, formData, cookies, sxsrf);

    console.log("Form submission successful:", submissionStatus);
    return submissionStatus;
  } catch (error) {
    throw new Error(`Error sending event to UL360:`, error);
  }
}
