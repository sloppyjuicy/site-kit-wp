/**
 * Validation function tests.
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
 * Internal dependencies
 */
import {
	isValidConversionID,
	isValidPaxConversionID,
	isValidExtCustomerID,
} from './validation';

describe( 'modules/ads validations', () => {
	describe( 'isValidConversionID', () => {
		it( 'should return TRUE when a valid conversionID is passed', () => {
			expect( isValidConversionID( 'AW-123456789' ) ).toBe( true );
		} );

		it.each( [
			[ 'false', false ],
			[ 'an integer', 12345 ],
			[ 'an empty string', '' ],
			[ 'a string not starting with AW', 'AB-123456789' ],
			[
				'a string starts with AW but ends without numbers',
				'AW-ABCDEFGHI',
			],
		] )( 'should return FALSE when %s is passed', ( _, conversionID ) => {
			expect( isValidConversionID( conversionID ) ).toBe( false );
		} );
	} );

	describe( 'isValidPaxConversionID', () => {
		it( 'should return TRUE when a valid PAX conversionID is passed', () => {
			expect( isValidPaxConversionID( 'AW-123456789' ) ).toBe( true );
		} );

		it.each( [
			[ 'false', false ],
			[ 'an integer', 12345 ],
			[ 'an empty string', '' ],
			[ 'a string not starting with AW', 'AB-123456789' ],
			[
				'a string starts with AW but ends without numbers',
				'AW-ABCDEFGHI',
			],
		] )( 'should return FALSE when %s is passed', ( _, conversionID ) => {
			expect( isValidPaxConversionID( conversionID ) ).toBe( false );
		} );
	} );

	describe( 'isValidExtCustomerID', () => {
		it( 'should return TRUE when a valid ext customer ID passed', () => {
			expect( isValidExtCustomerID( 'A-X765478HGG' ) ).toBe( true );
		} );

		it.each( [
			[ 'false', false ],
			[ 'an integer', 12345 ],
		] )( 'should return FALSE when %s is passed', ( _, extCustomerID ) => {
			expect( isValidExtCustomerID( extCustomerID ) ).toBe( false );
		} );
	} );
} );
