export async function getClassCodes(
  { authToken, domain, subscriberId, state }: Params,
  timeout: number = ACME_DEFAULT_TIMEOUT
): Promise<ClassCodeFromAPI[]> {
  const endpoint = new URL(
    `${domain}/api/v1/state-classes-eligibility/classCodes/${state}`
  );

  const response = await axios({
    method: 'GET',
    url: endpoint.toString(),
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      subscriber_id: subscriberId
    },
    timeout
  });

  const classCodesJson = response.data;

  return classCodesJson.Data as ClassCodeFromAPI[];
}
