/**
 * Admin Bar Unique Visitors Component Stories.
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
import { withWidgetComponentProps } from '../../googlesitekit/widgets/util';
import {
	setupAnalyticsGatheringData,
	setupAnalyticsMockReports,
	widgetDecorators,
} from './common.stories';
import WithRegistrySetup from '../../../../tests/js/WithRegistrySetup';
import AdminBarUniqueVisitors from './AdminBarUniqueVisitors';

const WidgetWithComponentProps = withWidgetComponentProps( 'widget-slug' )(
	AdminBarUniqueVisitors
);

const Template = ( { setupRegistry = () => {}, ...args } ) => (
	<WithRegistrySetup func={ setupRegistry }>
		<WidgetWithComponentProps { ...args } />
	</WithRegistrySetup>
);

export const Ready = Template.bind( {} );
Ready.storyName = 'Ready';
Ready.args = {
	setupRegistry: setupAnalyticsMockReports,
};

export const GatheringDataLegacy = Template.bind( {} );
GatheringDataLegacy.storyName = 'Gathering Data (Legacy)';

export const GatheringData = Template.bind( {} );
GatheringData.storyName = 'GatheringData';
GatheringData.args = {
	setupRegistry: setupAnalyticsGatheringData,
};
GatheringData.parameters = {
	features: [ 'zeroDataStates' ],
};

export default {
	title: 'Views/AdminBarApp/AdminBarUniqueVisitors',
	decorators: widgetDecorators,
};
