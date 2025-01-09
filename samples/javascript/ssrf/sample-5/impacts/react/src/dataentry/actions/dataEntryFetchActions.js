function fetchCurrentEmissionsTotals(qciIDs) {
    // Send a request for each QCI and then combines the results.
    // We only fetch for QCIs where we don't have all the answers on hand, however, so
    // hopefully won't bombard the server under normal circumstances.
    const urls = qciIDs.map((qciID) => `/api/3.0/assessments/collection/${qciID}/current-emissions-total`);
    let combinedOutput = {};
    const requests = urls.map((url) => axios.get(url), {
        withCredentials: true
    });
    return axios.all(requests).then((responses) => {
        responses.forEach((resp) => {
          combinedOutput = {...combinedOutput, ...resp.data};
        })
        return combinedOutput;
    })
    .catch(handleError)
}

export const fetchDataEntrySecondaryContent = (qcID, qcisRequiringEmissionsTotal, permissions, pageLength) => {
    return function (dispatch) {
        dispatch(requestDataEntrySecondaryContent());
        axios.all([fetchAnnotations(qcID, pageLength), fetchEvidence(qcID, pageLength),
                   fetchEmissions(qcID, pageLength), fetchPreviousKPIs(qcID, permissions),
                   fetchPreviousEmissionsTotals(qcID), fetchCurrentEmissionsTotals(qcisRequiringEmissionsTotal)])
                .then(axios.spread((annotations, evidence, emissions, previousKPIs, previousEmissionsTotals, currentEmissionsTotals) => {
                    let data = {annotations, evidence, emissions, previousKPIs, previousEmissionsTotals, currentEmissionsTotals};
                    let error = getError(data);
                    if (error){
                        dispatch(receiveDataEntryError(error))
                    } else {
                        dispatch(receiveDataEntrySecondaryContent(data));
                    }
                }));
    }
}
