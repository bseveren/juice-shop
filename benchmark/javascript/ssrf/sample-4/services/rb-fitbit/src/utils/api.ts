export const createActivitySubscription = async (fitbitUserId: string, accessToken: string) => {
  try {
    await retry(async () => {
      logger.debug('Creating Fitbit activity subscription for fitbit user: ', fitbitUserId)
      const response = (await got
        .post(
          `${FITBIT_BASE_URL}/1/user/${fitbitUserId}/activities/apiSubscriptions/${FITBIT_SUBSCRIPTION_ID}-${fitbitUserId}.json`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )
        .json()) as FitbitActivitySubscriptionResponse
      logger.debug('createActivitySubscription response', response)
    }, DEFAULT_RETRY_OPTIONS)
  } catch (e) {
    throw new Error(`Failed to create Fitbit activity subscription: ${e}`)
  }
}
