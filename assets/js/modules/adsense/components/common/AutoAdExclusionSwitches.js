/**
 * AdSense Ad Exclusion Switches component.
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
import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { MODULES_ADSENSE } from '../../datastore/constants';
import Switch from '../../../../components/Switch';
const { useSelect, useDispatch } = Data;

export const AUTO_ADS_LOGGED_IN_USERS = 'loggedinUsers';
export const AUTO_ADS_CONTENT_CREATORS = 'contentCreators';

export const trackingExclusionLabels = {
	[ AUTO_ADS_LOGGED_IN_USERS ]: __(
		'All logged-in users',
		'google-site-kit'
	),
	[ AUTO_ADS_CONTENT_CREATORS ]: __(
		'Users who can write posts',
		'google-site-kit'
	),
};

export default function AutoAdExclusionSwitches() {
	const autoAdsDisabled = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getAutoAdsDisabled()
	);
	const { setAutoAdsDisabled } = useDispatch( MODULES_ADSENSE );

	let message;
	if (
		autoAdsDisabled &&
		autoAdsDisabled.includes( AUTO_ADS_LOGGED_IN_USERS )
	) {
		message = __(
			'Ads will not be displayed for all logged-in users.',
			'google-site-kit'
		);
	} else if (
		autoAdsDisabled &&
		autoAdsDisabled.includes( AUTO_ADS_CONTENT_CREATORS )
	) {
		message = __(
			'Ads will not be displayed for users that can write posts.',
			'google-site-kit'
		);
	} else {
		message = __(
			'Ads will be displayed for all users.',
			'google-site-kit'
		);
	}

	const updateAutoAdsDisabled = useCallback(
		( users, exclude ) => {
			const trackingDisabledArray = exclude
				? autoAdsDisabled.concat( users )
				: autoAdsDisabled.filter( ( item ) => item !== users );

			setAutoAdsDisabled( trackingDisabledArray );
		},
		[ autoAdsDisabled, setAutoAdsDisabled ]
	);

	const onChangeTrackContentCreators = useCallback(
		( event ) => {
			const { checked: exclude } = event.target;
			updateAutoAdsDisabled( AUTO_ADS_CONTENT_CREATORS, exclude );
		},
		[ updateAutoAdsDisabled ]
	);

	const onChangeTrackLoggedInUsers = useCallback(
		( event ) => {
			const { checked: exclude } = event.target;
			updateAutoAdsDisabled( AUTO_ADS_LOGGED_IN_USERS, exclude );
		},
		[ updateAutoAdsDisabled ]
	);

	if ( ! Array.isArray( autoAdsDisabled ) ) {
		return null;
	}

	return (
		<fieldset className="googlesitekit-analytics-auto-ads-disabled">
			<legend className="googlesitekit-setup-module__text">
				{ __( 'Don’t display ads for:', 'google-site-kit' ) }
			</legend>
			<div className="googlesitekit-settings-module__inline-items">
				<div className="googlesitekit-settings-module__inline-item">
					<Switch
						label={
							trackingExclusionLabels[ AUTO_ADS_LOGGED_IN_USERS ]
						}
						checked={ autoAdsDisabled.includes(
							AUTO_ADS_LOGGED_IN_USERS
						) }
						onClick={ onChangeTrackLoggedInUsers }
						hideLabel={ false }
					/>
				</div>
				{ ! autoAdsDisabled.includes( AUTO_ADS_LOGGED_IN_USERS ) && (
					<div className="googlesitekit-settings-module__inline-item">
						<Switch
							label={
								trackingExclusionLabels[
									AUTO_ADS_CONTENT_CREATORS
								]
							}
							checked={ autoAdsDisabled.includes(
								AUTO_ADS_CONTENT_CREATORS
							) }
							onClick={ onChangeTrackContentCreators }
							hideLabel={ false }
						/>
					</div>
				) }
			</div>
			<p className="googlesitekit-margin-top-0">{ message }</p>
		</fieldset>
	);
}
