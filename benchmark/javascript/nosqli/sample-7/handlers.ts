export const applyMixpanelCohortSync: Handler = (services, workers) => async (request, reply) => {
  let cohortId = 0;
  let action = "unknown";
  try {
    const payload = request.payload as IMixpanelWebhookPayload;
    action = payload.action;
    cohortId = Number(payload.parameters.mixpanel_cohort_id);

    const userIds = payload.parameters.members.map((m) => m.mixpanel_distinct_id);
    const chunks = chunk(userIds, MIXPANEL_APPLY_CHUNK_SIZE);
    const cohortInDb = await services.mongo.MixpanelCohortModel.findOne({
      mixpanelCohortId: cohortId,
    });
    if (cohortInDb) {
    }
  } catch (err) {}
};
