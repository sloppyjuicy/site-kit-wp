/**
 * DashboardUniqueVisitorsWidget Component Stories.
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
 * Internal dependencies
 */
import { CORE_WIDGETS, WIDGET_WIDTHS, WIDGET_AREA_STYLES } from '../../../../googlesitekit/widgets/datastore/constants';
import { CORE_USER } from '../../../../googlesitekit/datastore/user/constants';
import { accountsPropertiesProfiles } from '../../datastore/__fixtures__';
import { STORE_NAME } from '../../datastore/constants';
import { provideModules, provideSiteInfo } from '../../../../../../tests/js/utils';
import { provideAnalyticsMockReport } from '../../util/data-mock';
import WidgetAreaRenderer from '../../../../googlesitekit/widgets/components/WidgetAreaRenderer';
import WithRegistrySetup from '../../../../../../tests/js/WithRegistrySetup';
import DashboardUniqueVisitorsWidget, { selectSparklineArgs, selectReportArgs } from './DashboardUniqueVisitorsWidget';

const areaName = 'moduleAnalyticsMain';
const widgetSlug = 'analyticsUniqueVisitors';
const currentEntityURL = 'https://www.example.com/example-page/';

const WidgetAreaTemplate = ( args ) => {
	return (
		<WithRegistrySetup func={ args?.setupRegistry }>
			<WidgetAreaRenderer slug={ areaName } />
		</WithRegistrySetup>
	);
};

export const Loaded = WidgetAreaTemplate.bind();
Loaded.storyName = 'Loaded';
Loaded.args = {
	setupRegistry: ( registry ) => {
		provideAnalyticsMockReport( registry, selectReportArgs( registry.select ) );
		provideAnalyticsMockReport( registry, selectSparklineArgs( registry.select ) );
	},
};

export const Loading = WidgetAreaTemplate.bind();
Loading.storyName = 'Loading';
Loading.args = {
	setupRegistry: ( registry ) => {
		provideAnalyticsMockReport( registry, selectReportArgs( registry.select ) );
		provideAnalyticsMockReport( registry, selectSparklineArgs( registry.select ) );
		registry.dispatch( STORE_NAME ).startResolution( 'getReport', [ selectReportArgs( registry.select ) ] );
		registry.dispatch( STORE_NAME ).startResolution( 'getReport', [ selectSparklineArgs( registry.select ) ] );
	},
};

export const DataUnavailable = WidgetAreaTemplate.bind();
DataUnavailable.storyName = 'Data Unavailable';
DataUnavailable.args = {
	setupRegistry: ( registry ) => {
		const options = selectReportArgs( registry.select );
		registry.dispatch( STORE_NAME ).receiveGetReport( [], { options } );
	},
};

export const Error = WidgetAreaTemplate.bind();
Error.storyName = 'Error';
Error.args = {
	setupRegistry: ( registry ) => {
		const error = {
			code: 'test_error',
			message: 'Error message.',
			data: {},
		};
		const options = selectReportArgs( registry.select );
		registry.dispatch( STORE_NAME ).receiveError( error, 'getReport', [ options ] );
		registry.dispatch( STORE_NAME ).finishResolution( 'getReport', [ options ] );
	},
};

export const LoadedEntityURL = WidgetAreaTemplate.bind();
LoadedEntityURL.storyName = 'Loaded with entity URL set';
LoadedEntityURL.args = {
	setupRegistry: ( registry ) => {
		provideSiteInfo( registry, { currentEntityURL } );
		provideAnalyticsMockReport( registry, selectReportArgs( registry.select ) );
		provideAnalyticsMockReport( registry, selectSparklineArgs( registry.select ) );
	},
};

export const LoadingEntityURL = WidgetAreaTemplate.bind();
LoadingEntityURL.storyName = 'Loading with entity URL set';
LoadingEntityURL.args = {
	setupRegistry: ( registry ) => {
		provideSiteInfo( registry, { currentEntityURL } );
		provideAnalyticsMockReport( registry, selectReportArgs( registry.select ) );
		provideAnalyticsMockReport( registry, selectSparklineArgs( registry.select ) );
		registry.dispatch( STORE_NAME ).startResolution( 'getReport', [ selectReportArgs( registry.select ) ] );
		registry.dispatch( STORE_NAME ).startResolution( 'getReport', [ selectSparklineArgs( registry.select ) ] );
	},
};

export const DataUnavailableEntityURL = WidgetAreaTemplate.bind();
DataUnavailableEntityURL.storyName = 'Data Unavailable with entity URL set';
DataUnavailableEntityURL.args = {
	setupRegistry: ( registry ) => {
		const options = selectReportArgs( registry.select );
		registry.dispatch( STORE_NAME ).receiveGetReport( [], { options } );
	},
};

export const ErrorEntityURL = WidgetAreaTemplate.bind();
ErrorEntityURL.storyName = 'Error with entity URL set';
ErrorEntityURL.args = {
	setupRegistry: ( registry ) => {
		const error = {
			code: 'test_error',
			message: 'Error with entity URL set.',
			data: {},
		};

		provideSiteInfo( registry, { currentEntityURL } );
		const options = selectReportArgs( registry.select );
		registry.dispatch( STORE_NAME ).receiveError( error, 'getReport', [ options ] );
		registry.dispatch( STORE_NAME ).finishResolution( 'getReport', [ options ] );
	},
};

export default {
	title: 'Modules/Analytics/Widgets/DashboardUniqueVisitorsWidget',
	decorators: [
		( Story ) => {
			const setupRegistry = ( registry ) => {
				const [ property ] = accountsPropertiesProfiles.properties;
				registry.dispatch( STORE_NAME ).receiveGetSettings( {
					// eslint-disable-next-line sitekit/acronym-case
					accountID: property.accountId,
					// eslint-disable-next-line sitekit/acronym-case
					internalWebPropertyID: property.internalWebPropertyId,
					// eslint-disable-next-line sitekit/acronym-case
					profileID: property.defaultProfileId,
				} );

				registry.dispatch( CORE_WIDGETS ).registerWidgetArea( areaName, {
					title: 'Overview',
					style: WIDGET_AREA_STYLES.BOXES,
				} );
				registry.dispatch( CORE_WIDGETS ).registerWidget( widgetSlug, {
					Component: DashboardUniqueVisitorsWidget,
					width: WIDGET_WIDTHS.FULL,
				} );
				registry.dispatch( CORE_WIDGETS ).assignWidget( widgetSlug, areaName );
				registry.dispatch( CORE_USER ).setReferenceDate( '2020-09-08' );

				provideModules( registry, [ {
					active: true,
					connected: true,
					slug: 'analytics',
				} ] );
			};

			return (
				<WithRegistrySetup func={ setupRegistry }>
					<Story />
				</WithRegistrySetup>
			);
		},
	],
};
