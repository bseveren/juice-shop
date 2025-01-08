import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { Context } from '../../../context';
import { AcmeAdapter } from '../../../context/acme/adapter';
import { ClassCodeFromAPI } from '../../../context/acme/classCodes/getClassCodes';
import { AcmeMaster } from '../../../features';
import { AnswersData } from '../../../models/mongodb/ApplicationAnswers';
import { getLimitCoverageChosenMapper } from '../../../services/mutation/updateCoverage/updateMunichCoverage/getLimitCoverageChosenMapper';
import { getRegionAbbreviation, US, UsState } from '../../address/province';
import { TimeZone } from '../../timeZone';
import getSurveyObject from '../getSurveyObject';
import { CustomQuestionType, QuestionAnswersMap } from '../types';
import addAcmeToQuestionAnswersMap from './addAcmeToQuestionAnswersMap';
import { getQuestionAnswerDetail } from './helpers/getQuestionAnswerDetail';
const acmeCoverageSchema = z.object({
  acmeCoverage: z
    .object({
      chooseCoverage: z.boolean()
    })
    .optional(),
  acmeCoverageBroker: z
    .object({
      chooseCoverage: z.boolean()
    })
    .optional()
});

export default async function (
  answers: AnswersData,
  country: string,
  applicationId: ObjectId,
  timeZone: TimeZone,
  jsonFileName: string,
  context: Context,
  state?: string
): Promise<QuestionAnswersMap> {
  const { logger, startAcmeSession, features } = context;

  logger.debug('Getting Question Answers List for Acme');

  const acmeMaster = await features.check(AcmeMaster, context.user);

  const questionAnswersMap: QuestionAnswersMap = {};

  if (!acmeMaster) {
    return questionAnswersMap;
  }

  const {
    Acme_Coverage_Munich_201_WC_WORLD_EN,
    Acme_Coverage_Broker_901_WC_WORLD_EN
  } = answers;

  const parsedResult = acmeCoverageSchema.parse({
    acmeCoverage: Acme_Coverage_Munich_201_WC_WORLD_EN,
    acmeCoverageBroker: Acme_Coverage_Broker_901_WC_WORLD_EN
  });

  const { acmeCoverage, acmeCoverageBroker } = parsedResult;

  logger.debug('got acme coverage parsed result', parsedResult);

  if (
    !acmeCoverage?.chooseCoverage &&
    !acmeCoverageBroker?.chooseCoverage
  ) {
    return {};
  }

  const surveyObject = await getSurveyObject(jsonFileName, logger);
  // run trigger
  surveyObject.setDataCore(answers);
  surveyObject.runTriggers();
  const allQuestions = surveyObject.getAllQuestions() as CustomQuestionType[];

  if (!state) {
    throw new Error('State should be defined');
  }

  const shortName = getRegionAbbreviation(state);

  let classCodes: ClassCodeFromAPI[] = [];
  if (US.isShortName(shortName)) {
    if (AcmeAdapter.isSupportedState(shortName)) {
      try {
        logger.debug('Trying to start an Acme session');
        const acmeAdapter = await startAcmeSession();

        logger.debug('Downloading professions from Acme');
        classCodes = await acmeAdapter.getClassCodes({
          state: shortName as UsState
        });
      } catch (e) {
        logger.error(e);
      }
    }
  }
  const declineReason = 'Acme not eligible to be purchased online';
  questionAnswersMap['declineReasonAcme'] = {
    questionLabel: 'Reason to decline Acme quote',
    value: declineReason,
    questionType: 'declineReasonAcme',
    inSortedList: false
  };

  const limitCoverageChosenMapper = await getLimitCoverageChosenMapper(
    country,
    context
  );

  // record answers in 2nd json
  for (const question of allQuestions) {
    const { name: questionName } = question;
    // check answer set has it or not
    if (
      answers[questionName] === undefined ||
      answers[questionName] === null ||
      !questionName.startsWith('Acme')
    ) {
      continue;
    }
    getQuestionAnswerDetail(
      question,
      answers,
      timeZone,
      limitCoverageChosenMapper,
      questionAnswersMap,
      classCodes
    );
  }

  const questionAnswersMapAmrust = {
    ...questionAnswersMap,
    ...(await addAcmeToQuestionAnswersMap(answers, applicationId, context))
  };
