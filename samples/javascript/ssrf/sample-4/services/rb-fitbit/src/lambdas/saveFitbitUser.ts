import { UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { Handler } from 'aws-lambda'
import { OauthToken } from 'rb-gql-types'
import { dynamoClient, dynamoTables } from 'rb-utils/src/aws'
import { formatFitbitDate } from 'rb-utils/src/dates'
import handlerWrapper from 'rb-utils/src/handlerWrapper'
import logger from 'rb-utils/src/logger'
import { createActivitySubscription, getFitbitUser } from 'src/utils/api'

import { getAccessToken } from '../utils/auth'

interface SaveFitbitUserEvent {
  auth: OauthToken
  userId: string
  lastSynced?: string
}

/**
 * Saves a Fitbit user to the database by retrieving their Fitbit user ID and saving it along with their user ID.
 *
 * @param {SaveFitbitUserEvent} event - The event that triggered the function.
 * @returns {Promise<void>} A Promise that resolves when the Fitbit user has been saved to the database.
 * @throws {Error} If the Fitbit access token cannot be retrieved.
 */
export const saveFitbitUser: Handler<SaveFitbitUserEvent> = handlerWrapper(async (event) => {
  const { userId, auth, lastSynced } = event
  const accessToken = await getAccessToken({ auth, userId })

  if (accessToken) {
    const fitbitUserId = await getFitbitUserIdAndSaveToDB({ accessToken, userId, lastSynced })
    await createActivitySubscription(fitbitUserId, accessToken)
    logger.debug(`Fitbit activity subscription created for user ${userId}`)
  } else {
    throw new Error('Could not get fitbit access token')
  }
})
