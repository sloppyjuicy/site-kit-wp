/**
 * CurrentSurvey component.
 *
 * Site Kit by Google, Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * External dependencies
 */
import { useMount } from 'react-use';
import { Slide } from '@material-ui/core';

/**
 * WordPress dependencies
 */
import { useCallback, useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { CORE_FORMS } from '../../googlesitekit/datastore/forms/constants';
import { CORE_USER } from '../../googlesitekit/datastore/user/constants';
import SurveyCompletion from './SurveyCompletion';
import SurveyQuestionRating from './SurveyQuestionRating';
import SurveyTerms from './SurveyTerms';
const { useDispatch, useSelect } = Data;

const ComponentMap = {
	rating: SurveyQuestionRating,
};

const SURVEY_ANSWER_DELAY_MS = 300;

export default function CurrentSurvey() {
	const [ hasSentSurveyShownEvent, setHasSentSurveyShownEvent ] = useState(
		false
	);
	const [ hasSentCompletionEvent, setHasSentCompletionEvent ] = useState(
		false
	);
	const [ animateSurvey, setAnimateSurvey ] = useState( false );
	const [ hasAnsweredQuestion, setHasAnsweredQuestion ] = useState( false );

	const completions = useSelect( ( select ) =>
		select( CORE_USER ).getCurrentSurveyCompletions()
	);
	const questions = useSelect( ( select ) =>
		select( CORE_USER ).getCurrentSurveyQuestions()
	);
	const surveySession = useSelect( ( select ) =>
		select( CORE_USER ).getCurrentSurveySession()
	);
	const isTrackingEnabled = useSelect( ( select ) =>
		select( CORE_USER ).isTrackingEnabled()
	);

	const formName = surveySession
		? `survey-${ surveySession.session_id }`
		: null;
	const shouldHide = useSelect( ( select ) =>
		select( CORE_FORMS ).getValue( formName, 'hideSurvey' )
	);
	const answers = useSelect( ( select ) =>
		select( CORE_FORMS ).getValue( formName, 'answers' )
	);

	const { setValues } = useDispatch( CORE_FORMS );
	const { sendSurveyEvent } = useDispatch( CORE_USER );

	useEffect( () => {
		if ( questions?.length && ! hasSentSurveyShownEvent ) {
			setHasSentSurveyShownEvent( true );
			sendSurveyEvent( 'survey_shown' );
		}
	}, [ questions, hasSentSurveyShownEvent, sendSurveyEvent ] );

	const currentQuestionOrdinal =
		Math.max( 0, ...( answers || [] ).map( ( a ) => a.question_ordinal ) ) +
		1;
	const currentQuestion = questions?.find(
		( { question_ordinal: questionOrdinal } ) =>
			questionOrdinal === currentQuestionOrdinal
	);

	const answerQuestion = useCallback(
		( answer ) => {
			if ( hasAnsweredQuestion ) {
				return;
			}
			setHasAnsweredQuestion( true );

			sendSurveyEvent( 'question_answered', {
				// eslint-disable-next-line camelcase
				question_ordinal: currentQuestion?.question_ordinal,
				answer,
			} );

			setTimeout( () => {
				setValues( formName, {
					answers: [
						...( answers || [] ),
						{
							// eslint-disable-next-line camelcase
							question_ordinal: currentQuestion?.question_ordinal,
							answer,
						},
					],
				} );

				setHasAnsweredQuestion( false );
			}, SURVEY_ANSWER_DELAY_MS );
		},
		[
			answers,
			currentQuestion,
			formName,
			sendSurveyEvent,
			setValues,
			hasAnsweredQuestion,
		]
	);

	// Check to see if a completion trigger has been met.
	let triggeredCompletion;
	// We only have trigger conditions for questions that are answered with
	// ordinal values right now.
	const ordinalAnswerMap = answers?.length
		? answers.reduce( ( acc, answer ) => {
				return {
					...acc,
					[ answer.question_ordinal ]:
						answer.answer.answer.answer_ordinal,
				};
		  }, {} )
		: [];

	if ( questions?.length && currentQuestionOrdinal > questions?.length ) {
		// Use Array.some to avoid looping through all completions; once the first
		// matching completion has been found, treat the survey as complete.
		completions?.some( ( completion ) => {
			completion.trigger_condition.some( ( condition ) => {
				// If a question was answered with the appropriate value, a completion
				// trigger has been fulfilled and we should treat this survey as
				// complete.
				if (
					condition.answer_ordinal.includes(
						ordinalAnswerMap[ condition.question_ordinal ]
					)
				) {
					// eslint-disable-line camelcase
					triggeredCompletion = completion;
					return true;
				}

				return false;
			} );

			if ( triggeredCompletion ) {
				return true;
			}

			return false;
		} );

		// If no specific trigger has been found but all questions are answered, use
		// the first available trigger.
		if ( ! triggeredCompletion ) {
			triggeredCompletion = completions[ 0 ];
		}
	}

	const ctaOnClick = useCallback( () => {
		sendSurveyEvent( 'follow_up_link_clicked', {
			// eslint-disable-next-line camelcase
			completion_ordinal: triggeredCompletion?.completion_ordinal,
		} );
		sendSurveyEvent( 'survey_closed' );

		setValues( formName, { hideSurvey: true } );
	}, [ formName, sendSurveyEvent, setValues, triggeredCompletion ] );

	const dismissSurvey = useCallback( () => {
		sendSurveyEvent( 'survey_closed' );

		setAnimateSurvey( false );
	}, [ sendSurveyEvent ] );

	const handleAnimationOnExited = useCallback( () => {
		setValues( formName, { hideSurvey: true } );
	}, [ formName, setValues ] );

	useEffect( () => {
		if ( triggeredCompletion && ! hasSentCompletionEvent ) {
			setHasSentCompletionEvent( true );
			sendSurveyEvent( 'completion_shown', {
				// eslint-disable-next-line camelcase
				completion_ordinal: triggeredCompletion?.completion_ordinal,
			} );
		}
	}, [ hasSentCompletionEvent, sendSurveyEvent, triggeredCompletion ] );

	useMount( () => {
		setAnimateSurvey( true );
	} );

	if (
		shouldHide ||
		! questions ||
		! completions ||
		isTrackingEnabled === undefined
	) {
		return null;
	}

	if ( triggeredCompletion ) {
		return (
			<Slide
				direction="up"
				in={ animateSurvey }
				onExited={ handleAnimationOnExited }
			>
				<div className="googlesitekit-survey">
					<SurveyCompletion
						dismissSurvey={ dismissSurvey }
						ctaOnClick={ ctaOnClick }
						ctaText={ triggeredCompletion.follow_up_text }
						ctaURL={ triggeredCompletion.follow_up_url }
						title={ triggeredCompletion.completion_title }
					>
						{ triggeredCompletion.completion_text }
					</SurveyCompletion>
				</div>
			</Slide>
		);
	}

	const SurveyQuestionComponent =
		// eslint-disable-next-line camelcase
		ComponentMap[ currentQuestion?.question_type ];
	if ( ! SurveyQuestionComponent ) {
		return null;
	}

	return (
		<Slide
			direction="up"
			in={ animateSurvey }
			onExited={ handleAnimationOnExited }
		>
			<div className="googlesitekit-survey">
				<SurveyQuestionComponent
					key={ currentQuestion.question_text }
					answerQuestion={ answerQuestion }
					choices={ currentQuestion.question.answer_choice }
					dismissSurvey={ dismissSurvey }
					question={ currentQuestion.question_text }
				/>

				{ isTrackingEnabled === false &&
					currentQuestion?.question_ordinal === 1 && ( // eslint-disable-line camelcase
						<div className="googlesitekit-survey__footer">
							<SurveyTerms />
						</div>
					) }
			</div>
		</Slide>
	);
}
