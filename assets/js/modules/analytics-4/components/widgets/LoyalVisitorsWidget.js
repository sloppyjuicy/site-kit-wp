/**
 * LoyalVisitorsWidget component.
 *
 * Site Kit by Google, Copyright 2023 Google LLC
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
import PropTypes from 'prop-types';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { CORE_USER } from '../../../../googlesitekit/datastore/user/constants';
import {
	DATE_RANGE_OFFSET,
	MODULES_ANALYTICS_4,
} from '../../datastore/constants';
import MetricTileNumeric from '../../../../components/KeyMetrics/MetricTileNumeric';

const { useSelect, useInViewSelect } = Data;

export default function LoyalVisitorsWidget( { Widget, WidgetNull } ) {
	const keyMetricsWidgetHidden = useSelect( ( select ) =>
		select( CORE_USER ).isKeyMetricsWidgetHidden()
	);

	// One combined select hook is used to prevent unnecessary selects
	// if the key metrics widget is hidden.
	const [ report, loading ] = useInViewSelect( ( select ) => {
		if ( keyMetricsWidgetHidden !== false ) {
			return [];
		}

		const { getReport, hasFinishedResolution } =
			select( MODULES_ANALYTICS_4 );

		const reportOptions = {
			...select( CORE_USER ).getDateRangeDates( {
				offsetDays: DATE_RANGE_OFFSET,
				compare: true,
			} ),
			dimensions: [ 'newVsReturning' ],
			metrics: [ { name: 'activeUsers' } ],
		};

		return [
			getReport( reportOptions ),
			! hasFinishedResolution( 'getReport', [ reportOptions ] ),
		];
	} );

	if ( keyMetricsWidgetHidden !== false ) {
		return <WidgetNull />;
	}

	const newVisitors =
		parseInt( report?.rows?.[ 1 ]?.metricValues[ 0 ]?.value, 10 ) || 0;
	const returningVisitors =
		parseInt( report?.rows?.[ 3 ]?.metricValues[ 0 ]?.value, 10 ) || 0;
	const totalVisitors = newVisitors + returningVisitors;

	const prevNewVisitors =
		parseInt( report?.rows?.[ 0 ]?.metricValues[ 0 ]?.value, 10 ) || 0;
	const prevReturningVisitors =
		parseInt( report?.rows?.[ 2 ]?.metricValues[ 0 ]?.value, 10 ) || 0;
	const prevTotalVisitors = prevNewVisitors + prevReturningVisitors;

	const currentPercentage =
		totalVisitors > 0 ? returningVisitors / totalVisitors : 0;
	const prevPercentage =
		prevTotalVisitors > 0 ? prevReturningVisitors / prevTotalVisitors : 0;

	const format = {
		style: 'percent',
		signDisplay: 'exceptZero',
		maximumFractionDigits: 1,
	};

	return (
		<MetricTileNumeric
			Widget={ Widget }
			title={ __( 'Loyal visitors', 'google-site-kit' ) }
			metricValue={ currentPercentage }
			metricValueFormat={ format }
			subText={ sprintf(
				/* translators: %d: Number of total visitors visiting the site. */
				__( 'of %d total visitors', 'google-site-kit' ),
				totalVisitors
			) }
			previousValue={ prevPercentage }
			currentValue={ currentPercentage }
			loading={ loading }
		/>
	);
}

LoyalVisitorsWidget.propTypes = {
	Widget: PropTypes.elementType.isRequired,
	WidgetNull: PropTypes.elementType.isRequired,
};
