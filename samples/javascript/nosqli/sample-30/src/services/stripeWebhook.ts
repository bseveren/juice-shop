export const receiveWebhookEvent = async (payload: string, signature: string) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
    if (
      !(
        event.type.startsWith('customer.subscription') ||
        event.type.startsWith('invoice') ||
        event.type.startsWith('payment_intent') ||
        event.type.startsWith('checkout.session')
      )
    ) {
      return;
    }
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;
      case 'invoice.voided':
        await handlePaymentFailed(event);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;
    }
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      logger.error(`An error occurred: ${err.statusCode} - ${err.code} - ${err.message}`);
      throw (new ErrorWithCode(err.message).status = err.statusCode);
    } else {
      logger.error('Another problem occurred, maybe unrelated to Stripe.');
      throw err;
    }
  }
};

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscriptionEvent = event.data.object as Stripe.Subscription;
  logger.info('⚡ Expiring subscription');
  const subscription = await subscriptionInformationModel
    .findOne({
      providerAccountID: subscriptionEvent.customer,
      providerSubscriptionID: subscriptionEvent.id,
    })
    .populate('storageQuota')
    .exec();
  if (subscription == null) {
    logger.info('No Subscription found');
    return;
  }
  // stripe subscriptions are handled in timestamp unix seconds, we need to have them in unix milliseconds
  const validUntilInMilliseconds = subscriptionEvent.current_period_end * 1000;
  subscription.state = 'expired';
  subscription.validUntil = validUntilInMilliseconds;
  subscription.storageQuota.validUntil = validUntilInMilliseconds;
  subscription.updated = Date.now();
  subscription.storageQuota.save();
  subscription.save();

  logger.info('⚡ Subscription expired');
}
