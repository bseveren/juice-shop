export const rxrevuAuthCheck = async (
  username: string,
  password: string,
  request: FastifyRequest
) => {
  const expectedCredentials = getExpectedRxrevuCredentialsForUser(username);
  validateExpectedCredentialsLength(expectedCredentials.password);
  if (password !== expectedCredentials.password) {
    throw new AuthError("Unauthorized");
  }
  request.organizationId = expectedCredentials.organizationId
}
