/**
 * TopCitiesDrivingLeadsWidget component.
 *
 * Site Kit by Google, Copyright 2024 Google LLC
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
 * Internal dependencies
 */
import { useSelect, useInViewSelect } from 'googlesitekit-data';
import {
	CORE_USER,
	KM_ANALYTICS_TOP_CITIES_DRIVING_LEADS,
} from '../../../../googlesitekit/datastore/user/constants';
import {
	DATE_RANGE_OFFSET,
	MODULES_ANALYTICS_4,
} from '../../datastore/constants';
import { ZeroDataMessage } from '../common';
import { numFmt } from '../../../../util';
import {
	MetricTileTable,
	MetricTileTablePlainText,
} from '../../../../components/KeyMetrics';
import whenActive from '../../../../util/when-active';
import ConnectGA4CTATileWidget from './ConnectGA4CTATileWidget';

function TopCitiesDrivingLeadsWidget( { Widget, WidgetNull } ) {
	const dates = useSelect( ( select ) =>
		select( CORE_USER ).getDateRangeDates( {
			offsetDays: DATE_RANGE_OFFSET,
		} )
	);

	const detectedEvents = useSelect( ( select ) =>
		select( MODULES_ANALYTICS_4 ).getDetectedEvents()
	);
	const eventNames = [
		'submit_lead_form',
		'contact',
		'generate_lead',
	].filter( ( item ) => detectedEvents?.includes( item ) );

	if (
		eventNames.includes( 'submit_lead_form' ) &&
		eventNames.includes( 'contact' )
	) {
		eventNames.splice( eventNames.indexOf( 'contact' ), 1 );
	}

	const isTopCitiesDrivingLeadsWidgetActive = useSelect( ( select ) =>
		select( CORE_USER ).isKeyMetricActive(
			KM_ANALYTICS_TOP_CITIES_DRIVING_LEADS
		)
	);

	const showWidget =
		isTopCitiesDrivingLeadsWidgetActive || eventNames?.length;

	const topCitiesReportOptions = {
		...dates,
		dimensions: [ 'city', 'eventName' ],
		dimensionFilters: {
			eventName: {
				filterType: 'inListFilter',
				value: eventNames,
			},
		},
		metrics: [ { name: 'eventCount' } ],
		orderby: [
			{
				metric: {
					metricName: 'eventCount',
				},
				desc: true,
			},
		],
		limit: 3,
	};

	const topCitiesReport = useInViewSelect(
		( select ) =>
			showWidget && eventNames.length
				? select( MODULES_ANALYTICS_4 ).getReport(
						topCitiesReportOptions
				  )
				: undefined,
		[ showWidget, eventNames, topCitiesReportOptions ]
	);

	const error = useSelect( ( select ) =>
		select( MODULES_ANALYTICS_4 ).getErrorForSelector( 'getReport', [
			topCitiesReportOptions,
		] )
	);

	const loading = useSelect( ( select ) =>
		showWidget
			? ! select( MODULES_ANALYTICS_4 ).hasFinishedResolution(
					'getReport',
					[ topCitiesReportOptions ]
			  )
			: undefined
	);

	const { rows = [] } = topCitiesReport || {};

	const columns = [
		{
			field: 'dimensionValues',
			Component( { fieldValue } ) {
				const [ title ] = fieldValue;

				return <MetricTileTablePlainText content={ title.value } />;
			},
		},
		{
			field: 'metricValues.0.value',
			Component( { fieldValue } ) {
				return <strong>{ numFmt( fieldValue ) }</strong>;
			},
		},
	];

	if ( ! showWidget ) {
		return <WidgetNull />;
	}

	return (
		<MetricTileTable
			Widget={ Widget }
			widgetSlug={ KM_ANALYTICS_TOP_CITIES_DRIVING_LEADS }
			loading={ loading }
			rows={ rows }
			columns={ columns }
			ZeroState={ ZeroDataMessage }
			error={ error }
			moduleSlug="analytics-4"
		/>
	);
}

TopCitiesDrivingLeadsWidget.propTypes = {
	Widget: PropTypes.elementType.isRequired,
};

export default whenActive( {
	moduleName: 'analytics-4',
	FallbackComponent: ConnectGA4CTATileWidget,
} )( TopCitiesDrivingLeadsWidget );
