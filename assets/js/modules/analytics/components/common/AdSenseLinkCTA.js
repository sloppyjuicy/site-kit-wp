/**
 * Analytics AdSense Link CTA component.
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
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import CTA from '../../../../components/legacy-notifications/cta';
import { CORE_SITE } from '../../../../googlesitekit/datastore/site/constants';
const { useSelect } = Data;

export default function AdSenseLinkCTA() {
	const supportURL = useSelect( ( select ) =>
		select( CORE_SITE ).getGoogleSupportURL( {
			path: '/adsense/answer/6084409',
		} )
	);

	return (
		<CTA
			title={ __( 'Link Analytics and AdSense', 'google-site-kit' ) }
			description={ __(
				'Get reports for your top earning pages by linking your Analytics and AdSense accounts',
				'google-site-kit'
			) }
			ctaLink={ supportURL }
			ctaLabel={ __( 'Learn more', 'google-site-kit' ) }
		/>
	);
}
