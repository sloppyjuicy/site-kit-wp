/**
 * `modules/adsense` data store: adblocker tests.
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
import { MODULES_ADSENSE } from './constants';
import {
	createTestRegistry,
	muteFetch,
	unsubscribeFromAll,
	untilResolved,
} from '../../../../../tests/js/utils';

import { detectAnyAdblocker as mockDetectAnyAdblocker } from 'just-detect-adblock';
jest.mock( 'just-detect-adblock' );

function stubIsAdBlockerDetected( detected ) {
	mockDetectAnyAdblocker.mockImplementation(
		() =>
			new Promise( ( resolve ) =>
				setTimeout( () => resolve( !! detected ) )
			)
	);
}

describe( 'modules/adsense adblocker', () => {
	let registry;

	beforeAll( () => jest.useRealTimers() );
	afterAll( () => jest.useFakeTimers() );

	beforeEach( () => {
		registry = createTestRegistry();
	} );

	afterEach( () => {
		unsubscribeFromAll( registry );
		mockDetectAnyAdblocker.mockReset();
	} );

	describe( 'actions', () => {
		describe( 'receiveIsAdBlockerActive', () => {
			it( 'requires the isAdBlockerActive param to be boolean', () => {
				expect( () => {
					registry
						.dispatch( MODULES_ADSENSE )
						.receiveIsAdBlockerActive();
				} ).toThrow( 'isAdBlockerActive must be boolean.' );
			} );

			it( 'receives and sets isAdBlockerActive', () => {
				registry
					.dispatch( MODULES_ADSENSE )
					.receiveIsAdBlockerActive( true );

				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBe( true );
			} );
		} );
	} );

	describe( 'selectors', () => {
		describe( 'isAdBlockerActive', () => {
			it( 'uses a resolver to query detection using detectAnyAdblocker', async () => {
				stubIsAdBlockerDetected( false );
				muteFetch( 'path:/favicon.ico' );

				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBeUndefined();
				await untilResolved(
					registry,
					MODULES_ADSENSE
				).isAdBlockerActive();

				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBe( false );
				expect( mockDetectAnyAdblocker ).toHaveBeenCalled();
			} );

			it( 'falls back to a test request to a well-known static asset with bait in the query string', async () => {
				stubIsAdBlockerDetected( false );
				fetchMock.getOnce( 'path:/favicon.ico', {
					throws: new TypeError( 'Failed to fetch' ),
				} );

				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBeUndefined();
				await untilResolved(
					registry,
					MODULES_ADSENSE
				).isAdBlockerActive();

				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBe( true );
				expect( mockDetectAnyAdblocker ).toHaveBeenCalled();
				expect( fetchMock ).toHaveFetched( 'path:/favicon.ico' );
			} );

			it( 'resolver does not rely on detection if status is already known', async () => {
				stubIsAdBlockerDetected( true );
				// Set value to false, contrary to the detection utility above which would result in this being true.
				registry
					.dispatch( MODULES_ADSENSE )
					.receiveIsAdBlockerActive( false );

				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBe( false );
				await untilResolved(
					registry,
					MODULES_ADSENSE
				).isAdBlockerActive();

				// Value should still be false because the global with true is not considered.
				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBe( false );
				expect( fetchMock ).not.toHaveFetched();
			} );

			it( 'returns true if ad blocker is received as active', async () => {
				registry
					.dispatch( MODULES_ADSENSE )
					.receiveIsAdBlockerActive( true );

				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBe( true );
				await untilResolved(
					registry,
					MODULES_ADSENSE
				).isAdBlockerActive();

				// Value should still be true since resolver should not have changed anything.
				expect(
					registry.select( MODULES_ADSENSE ).isAdBlockerActive()
				).toBe( true );
				expect( fetchMock ).not.toHaveFetched();
			} );
		} );
	} );
} );
