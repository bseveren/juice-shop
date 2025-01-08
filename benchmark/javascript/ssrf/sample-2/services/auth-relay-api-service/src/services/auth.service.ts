export const resetConfirmAgainstRegion = async (
  { token, id, password, repeatPassword }: { token: string; id: string; password: string; repeatPassword: string },
  relayConfig: RelayConfig,
) => {
  const url = relayConfig.authApiUrl + '/auth/reset/confirm'
  await axios.post(url, { token, id, password, repeatPassword }, authServiceHeaders(relayConfig.returnUrl))
}
