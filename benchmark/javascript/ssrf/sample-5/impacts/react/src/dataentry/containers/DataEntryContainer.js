import { fetchDataEntryPrimaryContent, 
         fetchDataEntrySecondaryContent, fetchAnswerCalculations } from '../actions/dataEntryFetchActions';

const mapDispatchToProps = (dispatch) => {
    return {
        fetchDataEntryPrimaryContent: (pageLength) => {
            const qcid = getQuestionCollectionId();
            dispatch(fetchDataEntryPrimaryContent(qcid, pageLength));
        },
        fetchDataEntrySecondaryContent: (permissions, qcisRequiringEmissionsTotal, pageLength) => {
            const qcid = getQuestionCollectionId();
            dispatch(fetchDataEntrySecondaryContent(qcid, qcisRequiringEmissionsTotal, permissions, pageLength));
        },
        hideSendQuestionModal: () => {
            dispatch(hideSendQuestionModal());
        },
        hideAnswerCalculationsModal: () => {
            dispatch(hideAnswerCalculationsModal());
        },
        hideApproverFeedbackRequestModal: () => {
            dispatch(hideApproverFeedbackRequestModal());
        },
        hideQuestionHelpModal: () => {
            dispatch(hideQuestionHelpModal());
        },
        sendQuestionToColleague : (email, question) => {
            dispatch(sendQuestionToColleague(email, question));
        },
        fetchAnswerCalculations: (answer_id) => {
            dispatch(fetchAnswerCalculations(answer_id));
        },
        sendQuestionsToDataEntryUsers: (question_ids) => {
            dispatch(sendQuestionsToDataEntryUsers(question_ids))
        },
        hideDirectEmissionsModal: () => {
            dispatch(hideDirectEmissionsModal());
        },
        setDirectEmissions: (answer, emissions, mbi) => {
            dispatch(setDirectEmissions(answer, emissions, mbi));
        }
    }
}
