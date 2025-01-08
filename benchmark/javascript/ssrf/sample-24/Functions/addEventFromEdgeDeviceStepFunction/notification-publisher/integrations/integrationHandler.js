const { sendEventToUL360 } = require("./ul360Integration");

async function handleIntegrations(integrations, eventData, eventImg, shiftName, dataPrivacyLevel) {
    for (let integration of integrations) {
        if (integration.webhook && validateEndpoint(integration.webhook, integration.integration_id) && (dataPrivacyLevel !== DATA_PRIVACY_LEVELS.DISABLE_EVENT_MEDIA_TIMESTAMP) && (dataPrivacyLevel !== DATA_PRIVACY_LEVELS.DISABLE_TIMESTAMP)) {
            switch (integration.integration_id) {
                case 1:
                    console.log('Message response', await sendMessageToTeams(integration.webhook, eventData, eventImg));
                    break;
                case 2:
                    console.log('Message response', await sendSlackMessage(integration.webhook, eventData, eventImg, dataPrivacyLevel ));
                    break;
                case 3:
                    if (!(integration.meta?.['eco-online']?.mode || []).includes("flag-most-important-events")) {
                        console.log('Message response', await postToEcoOnline(integration.webhook, eventData));
                    }
                    break;
                case 6:
                    eventData["shift"] = shiftName;
                    console.log('Message response', await postToAmazoneChime(integration.webhook, eventData));
                    break;
                case 7:
                    console.log('Message response', await sendEventToUL360(integration?.webhook, eventData, integration?.meta));
                    break;
            }
        }
    }
}
