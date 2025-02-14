/**
 * `modules/adsense` data store: tags tests.
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
import { MODULES_ADSENSE } from './constants';
import { CORE_SITE } from '../../../googlesitekit/datastore/site/constants';
import {
	createTestRegistry,
	muteFetch,
	subscribeUntil,
	unsubscribeFromAll,
	untilResolved,
} from '../../../../../tests/js/utils';
import * as fixtures from './__fixtures__';
import * as factories from './__factories__';

describe( 'modules/adsense tags', () => {
	let registry;
	const homeURL = 'http://example.com/';

	beforeAll( () => {
		API.setUsingCache( false );
	} );

	beforeEach( () => {
		registry = createTestRegistry();
		registry.dispatch( CORE_SITE ).receiveSiteInfo( { homeURL } );
	} );

	afterAll( () => {
		API.setUsingCache( true );
	} );

	afterEach( () => {
		unsubscribeFromAll( registry );
	} );

	describe( 'selectors', () => {
		describe( 'getExistingTag', () => {
			it( 'gets the correct adsense tag', async () => {
				const expectedTag = 'ca-pub-12345678';

				fetchMock.getOnce(
					{ query: { tagverify: '1' } },
					{
						body: factories.generateHTMLWithTag( expectedTag ),
						status: 200,
					}
				);

				registry.select( MODULES_ADSENSE ).getExistingTag();

				await untilResolved(
					registry,
					MODULES_ADSENSE
				).getExistingTag();

				const existingTag = registry
					.select( MODULES_ADSENSE )
					.getExistingTag();
				expect( existingTag ).toEqual( expectedTag );
			} );
		} );

		describe( 'getTagPermission', () => {
			it( 'returns true if a user has access to this tag', async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/,
					{ body: fixtures.tagPermissionAccess, status: 200 }
				);

				const clientID = fixtures.tagPermissionAccess.clientID;
				const accountID = fixtures.tagPermissionAccess.accountID;
				const permission = fixtures.tagPermissionAccess.permission;

				const initialSelect = registry
					.select( MODULES_ADSENSE )
					.getTagPermission( clientID );

				// The connection info will be its initial value while the connection
				// info is fetched.
				expect( initialSelect ).toEqual( undefined );
				await subscribeUntil(
					registry,
					() =>
						registry
							.select( MODULES_ADSENSE )
							.getTagPermission( clientID ) !== undefined
				);

				const permissionForTag = registry
					.select( MODULES_ADSENSE )
					.getTagPermission( clientID );
				expect( fetchMock ).toHaveFetchedTimes( 1 );

				expect( permissionForTag ).toEqual( {
					accountID,
					permission,
				} );
			} );

			it( 'returns false if a user cannot access the requested tag', async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/,
					{ body: fixtures.tagPermissionNoAccess, status: 200 }
				);

				const clientID = fixtures.tagPermissionNoAccess.clientID;
				const accountID = fixtures.tagPermissionNoAccess.accountID;
				const permission = fixtures.tagPermissionNoAccess.permission;

				const initialSelect = registry
					.select( MODULES_ADSENSE )
					.getTagPermission( clientID );
				// The connection info will be its initial value while the connection
				// info is fetched.
				expect( initialSelect ).toEqual( undefined );
				await subscribeUntil(
					registry,
					() =>
						registry
							.select( MODULES_ADSENSE )
							.getTagPermission( clientID ) !== undefined
				);

				const permissionForTag = registry
					.select( MODULES_ADSENSE )
					.getTagPermission( clientID );
				expect( fetchMock ).toHaveFetchedTimes( 1 );

				expect( permissionForTag ).toEqual( {
					accountID,
					permission,
				} );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/,
					{ body: response, status: 500 }
				);

				const clientID = fixtures.tagPermissionAccess.clientID;

				registry.select( MODULES_ADSENSE ).getTagPermission( clientID );
				await subscribeUntil(
					registry,
					() =>
						registry
							.select( MODULES_ADSENSE )
							.isFetchingGetTagPermission( clientID ) === false
				);

				expect( fetchMock ).toHaveFetchedTimes( 1 );

				const permissionForTag = registry
					.select( MODULES_ADSENSE )
					.getTagPermission( clientID );
				expect( permissionForTag ).toEqual( undefined );
				expect( console ).toHaveErrored();
			} );
		} );

		describe( 'hasExistingTag', () => {
			it( 'returns true if an existing tag exists', async () => {
				registry
					.dispatch( MODULES_ADSENSE )
					.receiveGetExistingTag( 'ca-pub-12345678' );

				const hasExistingTag = registry
					.select( MODULES_ADSENSE )
					.hasExistingTag();

				await subscribeUntil( registry, () =>
					registry
						.select( MODULES_ADSENSE )
						.hasFinishedResolution( 'getExistingTag' )
				);

				expect( hasExistingTag ).toEqual( true );
			} );

			it( 'returns false if no existing tag exists', async () => {
				registry
					.dispatch( MODULES_ADSENSE )
					.receiveGetExistingTag( null );

				const hasExistingTag = registry
					.select( MODULES_ADSENSE )
					.hasExistingTag();

				await untilResolved(
					registry,
					MODULES_ADSENSE
				).getExistingTag();

				expect( hasExistingTag ).toEqual( false );
				expect( fetchMock ).not.toHaveFetched();
			} );

			it( 'returns undefined if existing tag has not been loaded yet', async () => {
				fetchMock.get( { query: { tagverify: '1' } }, { status: 200 } );
				const hasExistingTag = registry
					.select( MODULES_ADSENSE )
					.hasExistingTag();

				expect( hasExistingTag ).toEqual( undefined );

				await untilResolved(
					registry,
					MODULES_ADSENSE
				).getExistingTag();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
			} );
		} );

		describe( 'hasTagPermission', () => {
			it( 'makes a request via the getTagPermission selector if no tag has been loaded ', async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/,
					{ body: fixtures.tagPermissionAccess, status: 200 }
				);

				const { clientID } = fixtures.tagPermissionAccess;

				registry.select( MODULES_ADSENSE ).hasTagPermission( clientID );

				await subscribeUntil(
					registry,
					() =>
						registry
							.select( MODULES_ADSENSE )
							.getTagPermission( clientID ) !== undefined
				);

				const hasPermission = registry
					.select( MODULES_ADSENSE )
					.hasTagPermission( clientID );

				expect( hasPermission ).toEqual( true );
				expect( fetchMock ).toHaveFetchedTimes( 1 );
			} );

			it( "returns true if this user has permission to access this client's tag", async () => {
				const {
					accountID,
					permission,
					clientID,
				} = fixtures.tagPermissionAccess;

				registry.dispatch( MODULES_ADSENSE ).receiveGetTagPermission(
					{
						accountID,
						permission,
					},
					{ clientID }
				);

				const hasPermission = registry
					.select( MODULES_ADSENSE )
					.hasTagPermission( clientID );

				// Ensure the proper parameters were sent.
				await subscribeUntil(
					registry,
					() =>
						registry
							.select( MODULES_ADSENSE )
							.getTagPermission( clientID ) !== undefined
				);

				expect( hasPermission ).toEqual( true );
				expect( fetchMock ).not.toHaveFetched();
			} );

			it( 'returns false if no existing tag exists', async () => {
				const {
					accountID,
					permission,
					clientID,
				} = fixtures.tagPermissionNoAccess;

				registry.dispatch( MODULES_ADSENSE ).receiveGetTagPermission(
					{
						accountID,
						permission,
					},
					{ clientID }
				);

				const hasPermission = registry
					.select( MODULES_ADSENSE )
					.hasTagPermission( clientID );

				// Ensure the proper parameters were sent.
				await subscribeUntil(
					registry,
					() =>
						registry
							.select( MODULES_ADSENSE )
							.getTagPermission( clientID ) !== undefined
				);

				expect( hasPermission ).toEqual( false );
				expect( fetchMock ).not.toHaveFetched();
			} );

			it( 'returns undefined if existing tag has not been loaded yet', async () => {
				muteFetch(
					/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/
				);
				const hasPermission = registry
					.select( MODULES_ADSENSE )
					.hasTagPermission(
						fixtures.tagPermissionNoAccess.clientID
					);
				expect( hasPermission ).toEqual( undefined );
			} );
		} );

		describe( 'hasExistingTagPermission', () => {
			it( 'returns true if an existing tag exists and the user has permission for it', async () => {
				registry
					.dispatch( MODULES_ADSENSE )
					.receiveGetExistingTag( 'ca-pub-12345678' );
				registry.dispatch( MODULES_ADSENSE ).receiveGetTagPermission(
					{
						accountID: 'pub-12345678',
						permission: true,
					},
					{ clientID: 'ca-pub-12345678' }
				);

				const hasPermission = registry
					.select( MODULES_ADSENSE )
					.hasExistingTagPermission();

				await untilResolved(
					registry,
					MODULES_ADSENSE
				).getExistingTag();

				expect( hasPermission ).toEqual( true );
			} );

			it( 'returns false if an existing tag exists and the user does not have permission for it', async () => {
				registry
					.dispatch( MODULES_ADSENSE )
					.receiveGetExistingTag( 'ca-pub-12345678' );
				registry.dispatch( MODULES_ADSENSE ).receiveGetTagPermission(
					{
						accountID: 'pub-12345678',
						permission: false,
					},
					{ clientID: 'ca-pub-12345678' }
				);

				const hasPermission = registry
					.select( MODULES_ADSENSE )
					.hasExistingTagPermission();

				await untilResolved(
					registry,
					MODULES_ADSENSE
				).getExistingTag();

				expect( hasPermission ).toEqual( false );
			} );

			it( 'returns null if no existing tag exists', async () => {
				registry
					.dispatch( MODULES_ADSENSE )
					.receiveGetExistingTag( null );

				const hasPermission = registry
					.select( MODULES_ADSENSE )
					.hasExistingTagPermission();

				await untilResolved(
					registry,
					MODULES_ADSENSE
				).getExistingTag();

				expect( hasPermission ).toEqual( null );
				expect( fetchMock ).not.toHaveFetched();
			} );
		} );
	} );
} );
