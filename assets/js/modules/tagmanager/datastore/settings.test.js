/**
 * `modules/tagmanager` data store: settings tests.
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
import API from 'googlesitekit-api';
import {
	MODULES_TAGMANAGER,
	ACCOUNT_CREATE,
	CONTAINER_CREATE,
	CONTEXT_WEB,
	CONTEXT_AMP,
	FORM_SETUP,
} from './constants';
import {
	CORE_SITE,
	AMP_MODE_SECONDARY,
	AMP_MODE_PRIMARY,
} from '../../../googlesitekit/datastore/site/constants';
import { CORE_FORMS } from '../../../googlesitekit/datastore/forms/constants';
import { CORE_MODULES } from '../../../googlesitekit/modules/datastore/constants';
import { MODULES_ANALYTICS } from '../../analytics/datastore/constants';
import defaultModules, * as modulesFixtures from '../../../googlesitekit/modules/datastore/__fixtures__';
import * as fixtures from './__fixtures__';
import {
	accountBuilder,
	containerBuilder,
	buildAccountWithContainers,
	buildLiveContainerVersionWeb,
	buildLiveContainerVersionAMP,
} from './__factories__';
import {
	createTestRegistry,
	unsubscribeFromAll,
	muteFetch,
	provideModules,
} from '../../../../../tests/js/utils';
import { getItem, setItem } from '../../../googlesitekit/api/cache';
import { createCacheKey } from '../../../googlesitekit/api';
import fetchMock from 'fetch-mock';
import {
	parseLiveContainerVersionIDs,
	createBuildAndReceivers,
} from './__factories__/utils';
import { getNormalizedContainerName } from '../util';
import {
	INVARIANT_INSUFFICIENT_EXISTING_TAG_PERMISSION,
	INVARIANT_GTM_GA_PROPERTY_ID_MISMATCH,
	INVARIANT_MULTIPLE_ANALYTICS_PROPERTY_IDS,
	INVARIANT_INVALID_ACCOUNT_ID,
	INVARIANT_INVALID_AMP_CONTAINER_SELECTION,
	INVARIANT_INVALID_AMP_INTERNAL_CONTAINER_ID,
	INVARIANT_INVALID_CONTAINER_SELECTION,
	INVARIANT_INVALID_INTERNAL_CONTAINER_ID,
	INVARIANT_INVALID_CONTAINER_NAME,
} from './settings';

describe( 'modules/tagmanager settings', () => {
	let registry;

	const defaultSettings = {
		accountID: '',
		ampContainerID: '',
		containerID: '',
		internalAMPContainerID: '',
		internalContainerID: '',
		useSnippet: true,
	};

	const validSettings = {
		accountID: '100',
		containerID: 'GTM-WEB1234',
		internalContainerID: '300',
		useSnippet: true,
	};

	const validSettingsAMP = {
		accountID: '100',
		ampContainerID: 'GTM-AMP1234',
		internalAMPContainerID: '399',
		useSnippet: true,
	};

	const WPError = {
		code: 'internal_error',
		message: 'Something wrong happened.',
		data: { status: 500 },
	};

	beforeAll( () => {
		API.setUsingCache( false );
	} );

	beforeEach( () => {
		registry = createTestRegistry();
		// TODO: the analytics module should not be connected by default in the module fixtures assets/js/googlesitekit/modules/datastore/fixtures.json
		provideModules( registry, [
			{
				slug: 'analytics',
				active: false,
			},
		] );
		registry.dispatch( CORE_SITE ).receiveSiteInfo( {} );
	} );

	afterEach( () => {
		unsubscribeFromAll( registry );
	} );

	afterAll( () => {
		API.setUsingCache( true );
	} );

	function setPrimaryAMP() {
		registry
			.dispatch( CORE_SITE )
			.receiveSiteInfo( { ampMode: AMP_MODE_PRIMARY } );
	}
	function setSecondaryAMP() {
		registry
			.dispatch( CORE_SITE )
			.receiveSiteInfo( { ampMode: AMP_MODE_SECONDARY } );
	}

	describe( 'actions', () => {
		beforeEach( () => {
			// Receive empty settings to prevent unexpected fetch by resolver.
			registry.dispatch( MODULES_TAGMANAGER ).receiveGetSettings( {} );
		} );

		describe( 'submitChanges', () => {
			describe( 'with no AMP', () => {
				it( 'dispatches createContainer if the "set up a new container" option is chosen', async () => {
					registry.dispatch( MODULES_TAGMANAGER ).setSettings( {
						...validSettings,
						accountID: '12345',
						containerID: CONTAINER_CREATE,
					} );

					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						containerName: 'Sitekit',
					} );

					const createdContainer = {
						...fixtures.createContainer,
					};

					fetchMock.postOnce(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/create-container/,
						{ body: createdContainer, status: 200 }
					);
					fetchMock.postOnce(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/settings/,
						( url, opts ) => {
							const { data } = JSON.parse( opts.body );
							// Return the same settings passed to the API.
							return { body: data, status: 200 };
						}
					);

					const result = await registry
						.dispatch( MODULES_TAGMANAGER )
						.submitChanges();

					expect( fetchMock ).toHaveFetched(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/create-container/,
						{
							body: {
								data: {
									accountID: '12345',
									usageContext: CONTEXT_WEB,
									name: 'Sitekit',
								},
							},
						}
					);

					expect( result.error ).toBeFalsy();
					expect(
						registry.select( MODULES_TAGMANAGER ).getContainerID()
						// eslint-disable-next-line sitekit/acronym-case
					).toBe( createdContainer.publicId );
					expect(
						registry
							.select( MODULES_TAGMANAGER )
							.getInternalContainerID()
						// eslint-disable-next-line sitekit/acronym-case
					).toBe( createdContainer.containerId );
				} );

				it( 'handles an error if set while creating a container', async () => {
					registry.dispatch( MODULES_TAGMANAGER ).setSettings( {
						...validSettings,
						accountID: '12345',
						containerID: CONTAINER_CREATE,
					} );

					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						containerName: 'Sitekit',
					} );

					fetchMock.postOnce(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/create-container/,
						{ body: WPError, status: 500 }
					);

					await registry
						.dispatch( MODULES_TAGMANAGER )
						.submitChanges();

					expect( fetchMock ).toHaveFetched(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/create-container/,
						{
							body: {
								data: {
									accountID: '12345',
									usageContext: CONTEXT_WEB,
									name: 'Sitekit',
								},
							},
						}
					);

					expect(
						registry.select( MODULES_TAGMANAGER ).getContainerID()
					).toBe( CONTAINER_CREATE );
					expect(
						registry
							.select( MODULES_TAGMANAGER )
							.getErrorForAction( 'submitChanges' )
					).toEqual( WPError );
					expect( console ).toHaveErrored();
				} );

				it( 'dispatches saveSettings', async () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setSettings( validSettings );

					fetchMock.postOnce(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/settings/,
						{ body: validSettings, status: 200 }
					);

					await registry
						.dispatch( MODULES_TAGMANAGER )
						.submitChanges();

					expect( fetchMock ).toHaveFetched(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/settings/,
						{
							body: { data: validSettings },
						}
					);

					expect(
						registry
							.select( MODULES_TAGMANAGER )
							.haveSettingsChanged()
					).toBe( false );
				} );

				it( 'returns an error if saveSettings fails', async () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setSettings( validSettings );

					fetchMock.postOnce(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/settings/,
						{ body: WPError, status: 500 }
					);

					const result = await registry
						.dispatch( MODULES_TAGMANAGER )
						.submitChanges();

					expect( fetchMock ).toHaveFetched(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/settings/,
						{
							body: { data: validSettings },
						}
					);
					expect( result.error ).toEqual( WPError );
					expect( console ).toHaveErrored();
				} );

				it( 'invalidates module cache on success', async () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setSettings( validSettings );

					muteFetch(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/settings/
					);
					const cacheKey = createCacheKey(
						'modules',
						'tagmanager',
						'arbitrary-datapoint'
					);
					expect( await setItem( cacheKey, 'test-value' ) ).toBe(
						true
					);
					expect(
						( await getItem( cacheKey ) ).value
					).not.toBeFalsy();

					await registry
						.dispatch( MODULES_TAGMANAGER )
						.submitChanges();

					expect( ( await getItem( cacheKey ) ).value ).toBeFalsy();
				} );
			} );

			describe( 'with primary AMP', () => {
				beforeEach( () => setPrimaryAMP() );

				it( 'dispatches createContainer if the "set up a new container" option is chosen', async () => {
					registry.dispatch( MODULES_TAGMANAGER ).setSettings( {
						...validSettings,
						accountID: '12345',
						ampContainerID: CONTAINER_CREATE,
					} );

					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						ampContainerName: 'Sitekit AMP',
					} );

					const createdAMPContainer = containerBuilder( {
						// eslint-disable-next-line sitekit/acronym-case
						accountId: '12345',
						usageContext: [ CONTEXT_AMP ],
					} );

					fetchMock.postOnce(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/create-container/,
						{ body: createdAMPContainer, status: 200 }
					);

					fetchMock.postOnce(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/settings/,
						( url, opts ) => {
							const { data } = JSON.parse( opts.body );
							// Return the same settings passed to the API.
							return { body: data, status: 200 };
						}
					);

					await registry
						.dispatch( MODULES_TAGMANAGER )
						.submitChanges();

					expect( fetchMock ).toHaveFetched(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/create-container/,
						{
							body: {
								data: {
									accountID: '12345',
									usageContext: CONTEXT_AMP,
									name: 'Sitekit AMP',
								},
							},
						}
					);

					expect(
						registry
							.select( MODULES_TAGMANAGER )
							.getAMPContainerID()
						// eslint-disable-next-line sitekit/acronym-case
					).toBe( createdAMPContainer.publicId );
				} );
			} );

			describe( 'with secondary AMP', () => {
				beforeEach( () => setSecondaryAMP() );

				it( 'dispatches createContainer for both web and AMP containers when selected', async () => {
					registry.dispatch( MODULES_TAGMANAGER ).setSettings( {
						...validSettings,
						containerID: CONTAINER_CREATE,
						ampContainerID: CONTAINER_CREATE,
					} );

					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						containerName: 'Sitekit',
						ampContainerName: 'Sitekit AMP',
					} );

					const account = accountBuilder();
					const createdWebContainer = containerBuilder( {
						// eslint-disable-next-line sitekit/acronym-case
						accountId: account.accountId,
						usageContext: [ CONTEXT_WEB ],
					} );
					const createdAMPContainer = containerBuilder( {
						// eslint-disable-next-line sitekit/acronym-case
						accountId: account.accountId,
						usageContext: [ CONTEXT_AMP ],
					} );

					fetchMock.postOnce(
						{
							url: /^\/google-site-kit\/v1\/modules\/tagmanager\/data\/create-container/,
							body: { data: { usageContext: CONTEXT_WEB } },
						},
						{ body: createdWebContainer, status: 200 },
						{ matchPartialBody: true }
					);
					fetchMock.postOnce(
						{
							url: /^\/google-site-kit\/v1\/modules\/tagmanager\/data\/create-container/,
							body: { data: { usageContext: CONTEXT_AMP } },
						},
						{ body: createdAMPContainer, status: 200 },
						{ matchPartialBody: true }
					);
					fetchMock.postOnce(
						/^\/google-site-kit\/v1\/modules\/tagmanager\/data\/settings/,
						( url, opts ) => {
							const { data } = JSON.parse( opts.body );
							// Return the same settings passed to the API.
							return { body: data, status: 200 };
						}
					);

					const { error } = await registry
						.dispatch( MODULES_TAGMANAGER )
						.submitChanges();

					expect( error ).toBe( undefined );
					expect(
						registry.select( MODULES_TAGMANAGER ).getContainerID()
						// eslint-disable-next-line sitekit/acronym-case
					).toBe( createdWebContainer.publicId );
					expect(
						registry
							.select( MODULES_TAGMANAGER )
							.getAMPContainerID()
						// eslint-disable-next-line sitekit/acronym-case
					).toBe( createdAMPContainer.publicId );
				} );
			} );
		} );
	} );

	describe( 'selectors', () => {
		describe( 'isDoingSubmitChanges', () => {
			it( 'returns true while submitting changes', async () => {
				registry
					.dispatch( MODULES_TAGMANAGER )
					.receiveGetSettings( validSettings );

				expect(
					registry.select( MODULES_TAGMANAGER ).haveSettingsChanged()
				).toBe( false );
				expect(
					registry.select( MODULES_TAGMANAGER ).isDoingSubmitChanges()
				).toBe( false );

				const promise = registry
					.dispatch( MODULES_TAGMANAGER )
					.submitChanges();

				expect(
					registry.select( MODULES_TAGMANAGER ).isDoingSubmitChanges()
				).toBe( true );

				await promise;

				expect(
					registry.select( MODULES_TAGMANAGER ).isDoingSubmitChanges()
				).toBe( false );
			} );
		} );

		describe( 'canSubmitChanges', () => {
			beforeEach( () => {
				// Preload default settings to prevent the resolver from making unexpected requests
				// as this is covered in settings store tests.
				registry
					.dispatch( MODULES_TAGMANAGER )
					.receiveGetSettings( defaultSettings );
			} );

			describe( 'with no AMP', () => {
				beforeEach( () => {
					const { accountID, internalContainerID } = validSettings;
					registry
						.dispatch( CORE_SITE )
						.receiveSiteInfo( { ampMode: false } );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setSettings( validSettings );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetExistingTag( null );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetLiveContainerVersion(
							fixtures.liveContainerVersion,
							{ accountID, internalContainerID }
						);
					registry
						.dispatch( CORE_MODULES )
						.receiveGetModules( defaultModules );
				} );

				it( 'requires a valid accountID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry.dispatch( MODULES_TAGMANAGER ).setAccountID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_ACCOUNT_ID );
				} );

				it( 'requires a valid containerID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setContainerID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_CONTAINER_SELECTION );
				} );

				it( 'requires a valid internal container ID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalContainerID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_INTERNAL_CONTAINER_ID );
				} );

				it( 'requires permissions for an existing tag when present', () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetExistingTag( validSettings.containerID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetTagPermission(
							{ permission: true },
							{ containerID: validSettings.containerID }
						);

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetTagPermission(
							{ permission: false },
							{ containerID: validSettings.containerID }
						);

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INSUFFICIENT_EXISTING_TAG_PERMISSION );
				} );

				it( 'should throw if a new container name is invalid', () => {
					const { account, containers } = buildAccountWithContainers(
						{
							container: { usageContext: [ CONTEXT_WEB ] },
							count: 2,
						}
					);
					const accountID = account.accountId; // eslint-disable-line sitekit/acronym-case

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( accountID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetContainers( containers, { accountID } );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setContainerID( CONTAINER_CREATE );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalContainerID( '' );
					registry
						.dispatch( CORE_FORMS )
						.setValues( FORM_SETUP, { containerName: '     ' } );

					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_CONTAINER_NAME );
				} );

				it( 'should require a unique container name when creating a new web container', () => {
					const { account, containers } = buildAccountWithContainers(
						{
							container: { usageContext: [ CONTEXT_WEB ] },
							count: 2,
						}
					);
					const accountID = account.accountId; // eslint-disable-line sitekit/acronym-case

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( accountID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetContainers( containers, { accountID } );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setContainerID( CONTAINER_CREATE );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalContainerID( '' );
					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						containerName: containers[ 0 ].name,
					} );

					const normalizedContainerName = getNormalizedContainerName(
						containers[ 0 ].name
					);
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow(
						`a container with "${ normalizedContainerName }" name already exists`
					);

					registry
						.dispatch( CORE_FORMS )
						.setValues( FORM_SETUP, { containerName: 'SiteKit' } );
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
				} );

				it( 'does not support creating an account', () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( ACCOUNT_CREATE );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
				} );

				it( 'requires Analytics propertyID setting to match the propertyID in the web container', () => {
					const modules = modulesFixtures.withActive( 'analytics' );
					registry
						.dispatch( CORE_MODULES )
						.receiveGetModules( modules );
					registry
						.dispatch( MODULES_ANALYTICS )
						.receiveGetSettings( { propertyID: '' } );
					const liveContainerVersion = buildLiveContainerVersionWeb( {
						propertyID: 'UA-12345-1',
					} );
					parseLiveContainerVersionIDs(
						liveContainerVersion,
						( { accountID, containerID, internalContainerID } ) => {
							registry
								.dispatch( MODULES_TAGMANAGER )
								.setSettings( {
									...validSettings,
									accountID,
									containerID,
									internalContainerID,
								} );
							registry
								.dispatch( MODULES_TAGMANAGER )
								.receiveGetLiveContainerVersion(
									liveContainerVersion,
									{ accountID, internalContainerID }
								);
						}
					);

					// No property ID set in Analytics
					registry
						.select( MODULES_TAGMANAGER )
						.__dangerousCanSubmitChanges();
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
					// Matching property ID in Analytics and GTM
					registry
						.dispatch( MODULES_ANALYTICS )
						.setPropertyID( 'UA-12345-1' );
					registry
						.select( MODULES_TAGMANAGER )
						.__dangerousCanSubmitChanges();
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
					// Non-matching property IDs
					registry
						.dispatch( MODULES_ANALYTICS )
						.setPropertyID( 'UA-99999-9' );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_GTM_GA_PROPERTY_ID_MISMATCH );
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
				} );
			} );

			describe( 'with primary AMP', () => {
				beforeEach( () => {
					setPrimaryAMP();
					const {
						accountID,
						internalAMPContainerID: internalContainerID,
					} = validSettingsAMP;
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setSettings( validSettingsAMP );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetExistingTag( null );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetLiveContainerVersion(
							fixtures.liveContainerVersion,
							{ accountID, internalContainerID }
						);
					registry
						.dispatch( CORE_MODULES )
						.receiveGetModules( defaultModules );
				} );

				it( 'requires a valid accountID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry.dispatch( MODULES_TAGMANAGER ).setAccountID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_ACCOUNT_ID );
				} );

				it( 'requires a valid AMP containerID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					// Invalid web container ID is allowed (although technically not possible).
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setContainerID( '0' );
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAMPContainerID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_AMP_CONTAINER_SELECTION );
				} );

				it( 'requires a valid internal AMP container ID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					// Invalid internal web container ID is allowed (although technically not possible).
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalContainerID( '0' );
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalAMPContainerID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_AMP_INTERNAL_CONTAINER_ID );
				} );

				it( 'should throw if a new container name is invalid', () => {
					const {
						buildAndReceiveWebAndAMP,
					} = createBuildAndReceivers( registry );
					const { accountID } = buildAndReceiveWebAndAMP( {
						webPropertyID: 'UA-12345-1',
						ampPropertyID: 'UA-12345-1',
					} );

					const { containers } = buildAccountWithContainers( {
						account: { accountId: accountID }, // eslint-disable-line sitekit/acronym-case
						container: { usageContext: [ CONTEXT_AMP ] },
						count: 2,
					} );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( accountID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetContainers( containers, { accountID } );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAMPContainerID( CONTAINER_CREATE );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalAMPContainerID( '' );
					registry
						.dispatch( CORE_FORMS )
						.setValues( FORM_SETUP, { ampContainerName: '___' } );

					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_CONTAINER_NAME );
				} );

				it( 'supports creating an AMP container', () => {
					const {
						buildAndReceiveWebAndAMP,
					} = createBuildAndReceivers( registry );
					const { accountID } = buildAndReceiveWebAndAMP( {
						webPropertyID: 'UA-12345-1',
						ampPropertyID: 'UA-12345-1',
					} );

					const { containers } = buildAccountWithContainers( {
						account: { accountId: accountID }, // eslint-disable-line sitekit/acronym-case
						container: { usageContext: [ CONTEXT_AMP ] },
						count: 2,
					} );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( accountID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetContainers( containers, { accountID } );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAMPContainerID( CONTAINER_CREATE );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalAMPContainerID( '' );
					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						ampContainerName: containers[ 0 ].name,
					} );

					const normalizedContainerName = getNormalizedContainerName(
						containers[ 0 ].name
					);
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow(
						`an AMP container with "${ normalizedContainerName }" name already exists`
					);

					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						ampContainerName: 'Sitekit AMP',
					} );
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
				} );

				it( 'requires permissions for an existing tag when present', () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetExistingTag( validSettings.containerID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetTagPermission(
							{ permission: true },
							{ containerID: validSettings.containerID }
						);

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetTagPermission(
							{ permission: false },
							{ containerID: validSettings.containerID }
						);

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INSUFFICIENT_EXISTING_TAG_PERMISSION );
				} );

				it( 'does not support creating an account', () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( ACCOUNT_CREATE );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_ACCOUNT_ID );
				} );

				it( 'requires Analytics propertyID setting to match the propertyID in the AMP container', () => {
					const modules = modulesFixtures.withActive( 'analytics' );
					registry
						.dispatch( CORE_MODULES )
						.receiveGetModules( modules );
					registry
						.dispatch( MODULES_ANALYTICS )
						.receiveGetSettings( { propertyID: '' } );
					const liveContainerVersion = buildLiveContainerVersionAMP( {
						propertyID: 'UA-12345-1',
					} );
					parseLiveContainerVersionIDs(
						liveContainerVersion,
						( {
							accountID,
							internalContainerID,
							ampContainerID,
							internalAMPContainerID,
						} ) => {
							registry
								.dispatch( MODULES_TAGMANAGER )
								.setSettings( {
									...validSettings,
									accountID,
									ampContainerID,
									internalAMPContainerID,
								} );
							registry
								.dispatch( MODULES_TAGMANAGER )
								.receiveGetLiveContainerVersion(
									liveContainerVersion,
									{ accountID, internalContainerID }
								);
						}
					);

					// No property ID set in Analytics
					registry
						.select( MODULES_TAGMANAGER )
						.__dangerousCanSubmitChanges();
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
					// Matching property ID in Analytics and GTM
					registry
						.dispatch( MODULES_ANALYTICS )
						.setPropertyID( 'UA-12345-1' );
					registry
						.select( MODULES_TAGMANAGER )
						.__dangerousCanSubmitChanges();
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
					// Non-matching property IDs
					registry
						.dispatch( MODULES_ANALYTICS )
						.setPropertyID( 'UA-99999-9' );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_GTM_GA_PROPERTY_ID_MISMATCH );
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
				} );
			} );

			describe( 'with secondary AMP', () => {
				beforeEach( () => {
					setSecondaryAMP();
					registry.dispatch( MODULES_TAGMANAGER ).setSettings( {
						...validSettings,
						...validSettingsAMP,
					} );
					const { accountID, internalContainerID } = validSettings;
					const { internalAMPContainerID } = validSettingsAMP;
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetExistingTag( null );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetExistingTag( null );
					registry
						.dispatch( CORE_MODULES )
						.receiveGetModules( defaultModules );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetLiveContainerVersion(
							fixtures.liveContainerVersions.web.noGAWithVariable,
							{ accountID, internalContainerID }
						);
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetLiveContainerVersion(
							fixtures.liveContainerVersions.amp.noGA,
							{
								accountID,
								internalContainerID: internalAMPContainerID,
							}
						);
				} );

				it( 'requires a valid accountID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry.dispatch( MODULES_TAGMANAGER ).setAccountID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_ACCOUNT_ID );
				} );

				it( 'requires valid containerID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setContainerID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_CONTAINER_SELECTION );
				} );

				it( 'requires a valid AMP containerID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAMPContainerID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_AMP_CONTAINER_SELECTION );
				} );

				it( 'requires a valid internal container ID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalContainerID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_INTERNAL_CONTAINER_ID );
				} );

				it( 'requires a valid internal AMP container ID', () => {
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalAMPContainerID( '0' );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_AMP_INTERNAL_CONTAINER_ID );
				} );

				it( 'supports creating a web container', () => {
					const {
						buildAndReceiveWebAndAMP,
					} = createBuildAndReceivers( registry );
					const { accountID } = buildAndReceiveWebAndAMP( {
						webPropertyID: 'UA-12345-1',
						ampPropertyID: 'UA-12345-1',
					} );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( accountID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetContainers( [], { accountID } );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setContainerID( CONTAINER_CREATE );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalContainerID( '' );
					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						containerName: 'Sitekit',
					} );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
				} );

				it( 'supports creating an AMP container', () => {
					const {
						buildAndReceiveWebAndAMP,
					} = createBuildAndReceivers( registry );
					const { accountID } = buildAndReceiveWebAndAMP( {
						webPropertyID: 'UA-12345-1',
						ampPropertyID: 'UA-12345-1',
					} );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( accountID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetContainers( [], { accountID } );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAMPContainerID( CONTAINER_CREATE );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalAMPContainerID( '' );
					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						ampContainerName: 'Sitekit AMP',
					} );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
				} );

				it( 'supports creating an AMP container and a web container', () => {
					const { account, containers } = buildAccountWithContainers(
						{
							container: {
								usageContext: [ CONTEXT_WEB, CONTEXT_AMP ],
							},
							count: 2,
						}
					);
					const accountID = account.accountId; // eslint-disable-line sitekit/acronym-case

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( accountID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetContainers( containers, { accountID } );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.setContainerID( CONTAINER_CREATE );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalContainerID( '' );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAMPContainerID( CONTAINER_CREATE );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setInternalAMPContainerID( '' );

					// Creating a web container requires a unique container name.
					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						containerName: containers[ 0 ].name,
						ampContainerName: 'Sitekit AMP',
					} );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );

					const normalizedContainerName = getNormalizedContainerName(
						containers[ 0 ].name
					);
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow(
						`a container with "${ normalizedContainerName }" name already exists`
					);

					// Creating an AMP container requires a unique container name.
					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						containerName: 'Sitekit',
						ampContainerName: containers[ 1 ].name,
					} );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );

					const normalizedAMPContainerName = getNormalizedContainerName(
						containers[ 1 ].name
					);
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow(
						`an AMP container with "${ normalizedAMPContainerName }" name already exists`
					);

					// Creating containers with unique names.
					registry.dispatch( CORE_FORMS ).setValues( FORM_SETUP, {
						containerName: 'Sitekit',
						ampContainerName: 'Sitekit AMP',
					} );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
				} );

				it( 'requires permissions for an existing tag when present', () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetExistingTag( validSettings.containerID );
					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetTagPermission(
							{ permission: true },
							{ containerID: validSettings.containerID }
						);

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					registry
						.dispatch( MODULES_TAGMANAGER )
						.receiveGetTagPermission(
							{ permission: false },
							{ containerID: validSettings.containerID }
						);

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INSUFFICIENT_EXISTING_TAG_PERMISSION );
				} );

				it( 'does not support creating an account', () => {
					registry
						.dispatch( MODULES_TAGMANAGER )
						.setAccountID( ACCOUNT_CREATE );

					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_INVALID_ACCOUNT_ID );
				} );

				it( 'requires both containers to reference the same propertyID when an Analytics tag is present', () => {
					registry
						.dispatch( MODULES_ANALYTICS )
						.receiveGetSettings( { propertyID: '' } );
					const {
						buildAndReceiveWebAndAMP,
					} = createBuildAndReceivers( registry );

					// Matching property IDs
					buildAndReceiveWebAndAMP( {
						webPropertyID: 'UA-12345-1',
						ampPropertyID: 'UA-12345-1',
					} );
					registry
						.select( MODULES_TAGMANAGER )
						.__dangerousCanSubmitChanges();
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );

					// Non-matching property IDs
					buildAndReceiveWebAndAMP( {
						webPropertyID: 'UA-12345-1',
						ampPropertyID: 'UA-12345-99',
					} );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_MULTIPLE_ANALYTICS_PROPERTY_IDS );
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
				} );

				it( 'requires Analytics propertyID setting to match the propertyID in both containers', () => {
					const modules = modulesFixtures.withActive( 'analytics' );
					registry
						.dispatch( CORE_MODULES )
						.receiveGetModules( modules );
					registry
						.dispatch( MODULES_ANALYTICS )
						.receiveGetSettings( { propertyID: '' } );
					const {
						buildAndReceiveWebAndAMP,
					} = createBuildAndReceivers( registry );
					buildAndReceiveWebAndAMP( {
						webPropertyID: 'UA-12345-1',
						ampPropertyID: 'UA-12345-1',
					} );

					// This test only checks matching between the singular propertyID in containers
					// and the Analytics propertyID setting. This is because the check for
					// multiple property IDs (non-matching IDs between containers) happens before this
					// and results in a different validation error (see above).

					// No property ID set in Analytics
					registry
						.select( MODULES_TAGMANAGER )
						.__dangerousCanSubmitChanges();
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
					// Matching property ID in Analytics and GTM
					registry
						.dispatch( MODULES_ANALYTICS )
						.setPropertyID( 'UA-12345-1' );
					registry
						.select( MODULES_TAGMANAGER )
						.__dangerousCanSubmitChanges();
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( true );
					// Non-matching property IDs
					registry
						.dispatch( MODULES_ANALYTICS )
						.setPropertyID( 'UA-99999-9' );
					expect( () =>
						registry
							.select( MODULES_TAGMANAGER )
							.__dangerousCanSubmitChanges()
					).toThrow( INVARIANT_GTM_GA_PROPERTY_ID_MISMATCH );
					expect(
						registry.select( MODULES_TAGMANAGER ).canSubmitChanges()
					).toBe( false );
				} );
			} );
		} );
	} );
} );
