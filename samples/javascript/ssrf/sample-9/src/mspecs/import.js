const getCustomFields = async (env, serviceToken, tableName, parentId) => {
    const { URL } = config.mspecs[env];
    const url = `${URL}/customFields?q=tableName%3D%27${tableName}%27`;
    try {
        const Authorization = getAuthorization(env);
        const { data: fields } = await axios({
            method: 'GET',
            url,
            params: { servicetoken: serviceToken },
            headers: { Authorization },
        });
        const results = await Promise.all(fields.map(async (field) => {
            const [customValue] = await getCustomFieldsValue(env, serviceToken, field.id, parentId);
            return { [fixCustomName(field.name)]: customValue ? customValue.value : 0 };
        }));
        return results.reduce((ack, field) => ({
            ...ack,
            ...field,
        }), {});
    } catch (e) {
        throw Error(e.message);
    }
};

async function importEstate(env, token, estateId) {
    const start = Date.now();

    const { token: serviceToken } = await getServiceToken(env, token);
    const doResolve = getResolveChecker();
    const resolver = getResolver(env, serviceToken);
    const enumResolver = getEnumResolver(env, serviceToken);

    const estateData = await getEstate(env, serviceToken, estateId);

    if (estateData.collections.buildings) {
        estateData.collections.buildings = estateData.collections.buildings.slice(0, 10);
    }
    const estate = await traverseTree({ table: 'estates', data: estateData, env, doResolve, resolver, enumResolver });

    const sellers = await getSellers(env, serviceToken, estate.deal.id);
    estate.sellers = await resolveAllSync(sellers.map((seller) => {
        const { dealId, ...sellerData } = seller;
        return () => traverseTree({ table: 'sellers', data: sellerData, env, doResolve, resolver, enumResolver });
    }));

    // Data so far doesn't include anything but the main broker
    // We can get all brokers assigned to a deal/sale by using `${URL}/teamRoles?q=dealId=%27${dealId}%27`
    // but this will also include the main broker and the index of the main broker might be anything
    // therefore we remove the main broker and return the rest
    // NB! We assume that every deal/sale has a main broker. If this isn't a case we would have had problems years ago
    if (estate.deal && estate.deal.mainBrokerContact && estate.deal.mainBrokerContact.id) {
        const mainBrokerContactId = estate.deal.mainBrokerContact.id;
        const teamRoles = await getTeamRoles(env, serviceToken, estate.deal.id, mainBrokerContactId);
        estate.teamRoles = await resolveAllSync(teamRoles.map((teamRole) => {
            const { dealId, ...teamRoleData } = teamRole;
            return () => traverseTree({ table: 'teamRoles', data: teamRoleData, env, doResolve, resolver, enumResolver });
        }));
    }

    const viewings = await getViewings(env, serviceToken, estate.deal.id);
    estate.viewings = await resolveAllSync(viewings.map((viewing) => {
        const { dealId, ...viewingData } = viewing;
        return () => traverseTree({ table: 'viewings', data: viewingData, env, doResolve, resolver, enumResolver });
    }));

    const customFieldsEstate = await getCustomFields(env, serviceToken, 'estates', estate.id);
    const customFieldsDeal = await getCustomFields(env, serviceToken, 'deals', estate.deal.id);

    const data = {
        ...estate,
        ...customFieldsEstate,
        deal: {
            ...estate.deal,
            ...customFieldsDeal,
        },
    };

    logger.info('importEstate', {
        duration: Date.now() - start,
        env,
        token,
        estateId,
        data,
    });

    return data;
}
