/**
 * NoAudienceBannerWidget component.
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
import whenActive from '../../../../../../util/when-active';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { MODULES_ANALYTICS_4 } from '../../../../datastore/constants';
import NoAudienceBanner from './NoAudienceBanner';

const { useSelect } = Data;

function NoAudienceBannerWidget( { Widget, WidgetNull } ) {
	const availableAudiences = useSelect( ( select ) => {
		return select( MODULES_ANALYTICS_4 ).getAvailableAudiences();
	} );
	const configuredAudiences = useSelect( ( select ) =>
		select( MODULES_ANALYTICS_4 ).getConfiguredAudiences()
	);

	const hasNoMatchingAudience = configuredAudiences?.every(
		( audience ) =>
			Array.isArray( availableAudiences ) &&
			! availableAudiences?.includes( audience )
	);

	const configurableAudiences = availableAudiences?.filter(
		( element ) =>
			Array.isArray( configuredAudiences ) &&
			! configuredAudiences.includes( element )
	);

	if ( hasNoMatchingAudience ) {
		return (
			<Widget noPadding>
				<NoAudienceBanner
					hasConfigurableAudiences={
						!! configurableAudiences?.length
					}
				/>
			</Widget>
		);
	}

	return <WidgetNull />;
}

NoAudienceBannerWidget.propTypes = {
	Widget: PropTypes.elementType.isRequired,
	WidgetNull: PropTypes.elementType.isRequired,
};

export default whenActive( { moduleName: 'analytics-4' } )(
	NoAudienceBannerWidget
);
