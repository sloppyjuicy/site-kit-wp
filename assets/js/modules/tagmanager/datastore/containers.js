/**
 * `modules/tagmanager` data store: containers.
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
 * External dependencies
 */
import invariant from 'invariant';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import Data from 'googlesitekit-data';
import { MODULES_TAGMANAGER, CONTEXT_WEB, CONTEXT_AMP } from './constants';
import {
	isValidAccountID,
	isValidContainerID,
	isValidContainerName,
	isValidUsageContext,
} from '../util/validation';
import { createFetchStore } from '../../../googlesitekit/data/create-fetch-store';
const { createRegistrySelector, createRegistryControl } = Data;
import { createValidatedAction } from '../../../googlesitekit/data/utils';

// Actions
const WAIT_FOR_CONTAINERS = 'WAIT_FOR_CONTAINERS';

const fetchGetContainersStore = createFetchStore( {
	baseName: 'getContainers',
	argsToParams: ( accountID ) => {
		return { accountID };
	},
	validateParams: ( { accountID } = {} ) => {
		invariant(
			isValidAccountID( accountID ),
			'A valid accountID is required to fetch containers.'
		);
	},
	controlCallback: ( { accountID } ) => {
		// Always request both contexts to prevent filtering on server.
		// TODO: Remove `usageContext` param when legacy component is removed and datapoint
		// defaults to returning all containers if no context is provided.
		const usageContext = [ CONTEXT_WEB, CONTEXT_AMP ];
		return API.get(
			'modules',
			'tagmanager',
			'containers',
			{ accountID, usageContext },
			{ useCache: false }
		);
	},
	reducerCallback: ( state, containers, { accountID } ) => {
		return {
			...state,
			containers: {
				...state.containers,
				[ accountID ]: containers,
			},
		};
	},
} );

const fetchCreateContainerStore = createFetchStore( {
	baseName: 'createContainer',
	argsToParams( accountID, usageContext, { containerName } ) {
		return { accountID, usageContext, containerName };
	},
	validateParams: ( { accountID, usageContext, containerName } = {} ) => {
		invariant(
			isValidAccountID( accountID ),
			'A valid accountID is required to create a container.'
		);
		invariant(
			isValidUsageContext( usageContext ),
			'A valid usageContext is required to create a container.'
		);
		invariant(
			isValidContainerName( containerName ),
			'A valid containerName is required to create a container.'
		);
	},
	controlCallback: ( { accountID, usageContext, containerName: name } ) => {
		return API.set( 'modules', 'tagmanager', 'create-container', {
			accountID,
			usageContext,
			name,
		} );
	},
	reducerCallback( state, container, { accountID } ) {
		return {
			...state,
			containers: {
				...state.containers,
				[ accountID ]: [
					...( state.containers[ accountID ] || [] ),
					container,
				],
			},
		};
	},
} );

const baseInitialState = {
	containers: {},
};

const baseActions = {
	/**
	 * Creates a new Tag Manager container in the given account.
	 *
	 * @since 1.11.0
	 *
	 * @param {string} accountID          Google Tag Manager account ID.
	 * @param {string} usageContext       Container usage context. (Either 'web', or 'amp').
	 * @param {Object} args               Container arguments.
	 * @param {string} args.containerName The name for a new container.
	 * @return {Object} Object with `response` and `error`.
	 */
	createContainer: createValidatedAction(
		( accountID, usageContext, { containerName } ) => {
			invariant(
				isValidAccountID( accountID ),
				'A valid accountID is required to create a container.'
			);
			invariant(
				isValidUsageContext( usageContext ),
				'A valid usageContext is required to create a container.'
			);
			invariant(
				isValidContainerName( containerName ),
				'A valid containerName is required to create a container.'
			);
		},
		function* ( accountID, usageContext, { containerName } ) {
			const {
				response,
				error,
			} = yield fetchCreateContainerStore.actions.fetchCreateContainer(
				accountID,
				usageContext,
				{ containerName }
			);

			return { response, error };
		}
	),

	/**
	 * Sets selected container settings for the given container ID of the current account.
	 *
	 * Supports selecting a container that has not been received yet.
	 *
	 * @since 1.12.0
	 * @private
	 *
	 * @param {string} containerID Tag Manager container `publicId` of container to select.
	 */
	selectContainerByID: createValidatedAction(
		( containerID ) => {
			// This action relies on looking up the container in state to know what
			// settings to set the container IDs for. For this reason we cannot use this
			// for selecting the option to "set up a new container"
			// another instance here
			invariant(
				isValidContainerID( containerID ),
				'A valid container ID is required to select a container by ID.'
			);
		},
		function* ( containerID ) {
			const { select, dispatch } = yield Data.commonActions.getRegistry();
			const accountID = select( MODULES_TAGMANAGER ).getAccountID();

			if ( ! isValidAccountID( accountID ) ) {
				return;
			}

			// Containers may not be loaded yet for this account,
			// and no selections are done in the getContainers resolver, so we wait here.
			// This will not guarantee that containers exist, as an account may also have no containers
			// it will simply wait for `getContainers` to be resolved for this account ID.
			yield baseActions.waitForContainers( accountID );

			const container = select( MODULES_TAGMANAGER ).getContainerByID(
				accountID,
				containerID
			);
			if ( ! container ) {
				// Do nothing if the container was not found.
				return;
			}
			if ( container.usageContext.includes( CONTEXT_WEB ) ) {
				dispatch( MODULES_TAGMANAGER ).setContainerID( containerID );
				dispatch( MODULES_TAGMANAGER ).setInternalContainerID(
					// eslint-disable-next-line sitekit/acronym-case
					container.containerId
				);
			} else if ( container.usageContext.includes( CONTEXT_AMP ) ) {
				dispatch( MODULES_TAGMANAGER ).setAMPContainerID( containerID );
				dispatch( MODULES_TAGMANAGER ).setInternalAMPContainerID(
					// eslint-disable-next-line sitekit/acronym-case
					container.containerId
				);
			}
		}
	),

	/**
	 * Waits for containers to be resolved for the given account ID.
	 *
	 * @since 1.12.0
	 * @private
	 *
	 * @param {string} accountID Google Tag Manager account ID to await containers for.
	 * @return {Object} Redux-style action.
	 */
	waitForContainers: createValidatedAction(
		( accountID ) => {
			invariant(
				isValidAccountID( accountID ),
				'A valid accountID is required to wait for containers.'
			);
		},
		function* ( accountID ) {
			return {
				payload: { accountID },
				type: WAIT_FOR_CONTAINERS,
			};
		}
	),
};

const baseControls = {
	[ WAIT_FOR_CONTAINERS ]: createRegistryControl(
		( registry ) => ( { payload: { accountID } } ) => {
			// Select first to ensure resolution is always triggered.
			registry.select( MODULES_TAGMANAGER ).getContainers( accountID );
			const areContainersLoaded = () =>
				registry
					.select( MODULES_TAGMANAGER )
					.hasFinishedResolution( 'getContainers', [ accountID ] );

			if ( areContainersLoaded() ) {
				return;
			}

			return new Promise( ( resolve ) => {
				const unsubscribe = registry.subscribe( () => {
					if ( areContainersLoaded() ) {
						unsubscribe();
						resolve();
					}
				} );
			} );
		}
	),
};

const baseResolvers = {
	*getContainers( accountID ) {
		if ( ! isValidAccountID( accountID ) ) {
			return;
		}

		const { select } = yield Data.commonActions.getRegistry();

		if ( ! select( MODULES_TAGMANAGER ).getContainers( accountID ) ) {
			yield fetchGetContainersStore.actions.fetchGetContainers(
				accountID
			);
		}
	},
};

const baseSelectors = {
	/**
	 * Gets a container by its ID.
	 *
	 * @since 1.11.0
	 *
	 * @param {Object} state       Data store's state.
	 * @param {string} accountID   Account ID to find container in.
	 * @param {string} containerID Container (publicId) of container to get.
	 * @return {(Object|null|undefined)} Container object if found, `null` if not found, or `undefined` if not loaded yet.
	 */
	getContainerByID: createRegistrySelector(
		( select ) => ( state, accountID, containerID ) => {
			// Select all containers of the account to find the container, regardless of usageContext.
			const containers = select( MODULES_TAGMANAGER ).getContainers(
				accountID
			);

			if ( containers === undefined ) {
				return undefined;
			}

			return (
				containers.find(
					// eslint-disable-next-line sitekit/acronym-case
					( { publicId } ) => containerID === publicId
				) || null
			);
		}
	),

	/**
	 * Gets all web containers for the given account.
	 *
	 * @since 1.12.0
	 *
	 * @param {Object} state     Data store's state.
	 * @param {string} accountID Account ID to get containers for.
	 * @return {(Array|undefined)} Array of containers, or `undefined` if not loaded yet.
	 */
	getWebContainers: createRegistrySelector(
		( select ) => ( state, accountID ) => {
			const containers = select( MODULES_TAGMANAGER ).getContainers(
				accountID
			);

			if ( ! Array.isArray( containers ) ) {
				return undefined;
			}

			return containers.filter( ( { usageContext } ) =>
				usageContext.includes( CONTEXT_WEB )
			);
		}
	),

	/**
	 * Gets all AMP containers for the given account.
	 *
	 * @since 1.12.0
	 *
	 * @param {Object} state     Data store's state.
	 * @param {string} accountID Account ID to get containers for.
	 * @return {(Array|undefined)} Array of containers, or `undefined` if not loaded yet.
	 */
	getAMPContainers: createRegistrySelector(
		( select ) => ( state, accountID ) => {
			const containers = select( MODULES_TAGMANAGER ).getContainers(
				accountID
			);

			if ( ! Array.isArray( containers ) ) {
				return undefined;
			}

			return containers.filter( ( { usageContext } ) =>
				usageContext.includes( CONTEXT_AMP )
			);
		}
	),

	/**
	 * Gets all containers for the given account.
	 *
	 * @since 1.12.0
	 *
	 * @param {Object} state     Data store's state.
	 * @param {string} accountID Account ID to get containers for.
	 * @return {(Array|undefined)} Array of containers, or `undefined` if not loaded yet.
	 */
	getContainers( state, accountID ) {
		return state.containers[ accountID ];
	},

	/**
	 * Checks if containers are currently being fetched for the given account or not.
	 *
	 * @since 1.12.0
	 *
	 * @param {Object} state     Data store's state.
	 * @param {string} accountID Account ID to get containers for.
	 * @return {boolean} True if containers are being fetched for the given account, otherwise false.
	 */
	isDoingGetContainers: createRegistrySelector(
		( select ) => ( state, accountID ) => {
			return select( MODULES_TAGMANAGER ).isFetchingGetContainers(
				accountID
			);
		}
	),

	/**
	 * Checks if any request for creating a container is in progress.
	 *
	 * @since 1.11.0
	 *
	 * @param {Object} state Data store's state.
	 * @return {boolean} True if a request for create-container is in progress, otherwise false.
	 */
	isDoingCreateContainer( state ) {
		return Object.values( state.isFetchingCreateContainer ).some( Boolean );
	},
};

const store = Data.combineStores(
	fetchGetContainersStore,
	fetchCreateContainerStore,
	{
		initialState: baseInitialState,
		actions: baseActions,
		controls: baseControls,
		resolvers: baseResolvers,
		selectors: baseSelectors,
	}
);

export const {
	initialState,
	actions,
	controls,
	reducer,
	resolvers,
	selectors,
} = store;

export default store;
