async function _getDiscussionTokenCall(context, ffVariables) {
  if (!context.auth) {
    return _unauthenticatedResponse;
  }
  var userEmail = ffVariables["userEmail"];
  var userFirstName = ffVariables["userFirstName"];
  var userLastName = ffVariables["userLastName"];

  var url = `${hubspotGroup.baseUrl}/conversations/v3/visitor-identification/tokens/create`;
  var headers = {
    authorization: `Bearer ***`,
    "content-type": `application/json`,
  };
  var params = {};
  var ffApiRequestBody = `
{
  "email": "${userEmail}",
  "firstName": "${userFirstName}",
  "lastName": "${userLastName}"
}`;

  return makeApiRequest({
    method: "post",
    url,
    headers,
    params,
    body: createBody({
      headers,
      params,
      body: ffApiRequestBody,
      bodyType: "JSON",
    }),
    returnBody: true,
  });
}

async function makeApiRequest({
  method,
  url,
  headers,
  params,
  body,
  returnBody,
}) {
  return axios
    .request({
      method: method,
      url: url,
      headers: headers,
      params: params,
      ...(body && { data: body }),
    })
    .then((response) => {
      return {
        statusCode: response.status,
        headers: response.headers,
        ...(returnBody && { body: response.data }),
      };
    })
    .catch(function (error) {
      return {
        statusCode: error.response.status,
        headers: error.response.headers,
        ...(returnBody && { body: error.response.data }),
        error: error.message,
      };
    });
}
