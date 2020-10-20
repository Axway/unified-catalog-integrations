const fs = require('fs');
const yaml = require('js-yaml');
import { requestPromise, getIconData, commitToFs } from './utils';
import { loadConfig } from '@axway/amplify-config';

module.exports =  class AzureService {
	constructor(config, log) {
		this.config = config || {};
		this.proxySettings = {};
		this.log = log;
		// Assert required params
		let missingParam = [
			'tenantId',
			'clientId',
			'clientSecret',
			'subscriptionId',
			'resourceGroupName',
			'serviceName',
			'environmentName'
		].reduce((acc, cur) => {
			if (!this.config[cur]) {
				acc.push(cur);
				return acc;
			}
			return acc;
		}, []);

		if (missingParam.length) {
			console.log(`Missing required config: [${missingParam.join(', ')}]. Run 'amplify central azure-extension config set -h' to see a list of params`);
			return process.exit(1);
		} 
		
		const networkSettings = loadConfig().get('network');
		const strictSSL = networkSettings.strictSSL;
		const proxy = networkSettings.httpProxy;

		if (strictSSL === false) {
			this.proxySettings.strictSSL = false;
		}

		if (proxy) {
			try {
				const parsedProxy = new URL(proxy);
				this.proxySettings.proxy = proxy;
				console.log(`Connecting using proxy settings protocol:${parsedProxy.protocol}, host:${parsedProxy.hostname}, port: ${parsedProxy.port}, username: ${parsedProxy.username}, rejectUnauthorized: ${!this.proxySettings.strictSSL}`);
			} catch (e) {
				console.log(`Could not parse proxy url ${proxy}`);
				return process.exit(1);
			}
		}
		

		const {
			tenantId,
			clientId,
			clientSecret,
			subscriptionId,
			resourceGroupName,
			serviceName,
			filter
		} = this.config;

		// Filter settings for fetching apis
		let filterString = '';
		if (filter) {
			filterString = `&${filter.split(',').reduce((acc = '', curr) => `&${acc}&${curr}`)}`
		}

		// Request settings for auth and fetchings APIs
		this.requestSettings = {
			azureAuth: {
				method: 'POST',
				url: `https://login.microsoftonline.com/${tenantId}/oauth2/token`,
				headers: {
					'Content-Type': ['application/x-www-form-urlencoded', 'application/x-www-form-urlencoded']
				},
				form: {
					grant_type: 'client_credentials',
					client_id: clientId,
					client_secret: clientSecret,
					resource: 'https://management.azure.com/'
				},
				...this.proxySettings
			},
			getAPIs: {
				method: 'GET',
				url: `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${serviceName}/apis?api-version=2019-01-01&$top=100${filterString}`,
				...this.proxySettings
			},
			getSwagger: (name, token) => ({
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` },
				url: `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${serviceName}/apis/${name}?export=true&format=swagger&api-version=2019-01-01`,
				...this.proxySettings
			})
		}
	}

	// generate resources from APIs
	async generateResources () {
		console.log('Logging into Azure');
		const token = JSON.parse(await this._authorize()).access_token;
		console.log('Listing Azure APIs');
		const apis = JSON.parse(await this._listAPIs(token));
		return this._generateAssets(apis, token);
	}

	// auth azure
	_authorize() {
		return requestPromise(this.requestSettings.azureAuth);
	}

	// list azure apis
	_listAPIs (token) {
		return requestPromise({
			...this.requestSettings.getAPIs,
			headers: { Authorization: `Bearer ${token}` }
		});
	}

	// fetch an azure swagger def
	async _getSwagger(name, token) {
		return requestPromise(this.requestSettings.getSwagger(name, token))
	}

	// take the api info and the config info and prep data for generating yaml files
	async _generateAssets (apis, token) {
		console.log('Building Resources');
		const assetParams = [];
		for (let api of apis.value) {
			const swagger = await this._getSwagger(api.name, token);
			const swaggerJson = JSON.parse(swagger).value;
			const apiServiceName = `${api.name}`;
			const apiServiceRevisionName = `${apiServiceName}-${api.properties.apiRevision}`;
			const apiProperties = api && api.properties || {};
			const displayName = apiProperties.displayName || '';
			const attributes = {
				azureServiceName: this.config.serviceName,
				azureResourceGroupName: this.config.resourceGroupName,
				azureApiName: apiServiceName
			};
			const environmentName = this.config.environmentName;
			const apiDescription = apiProperties.description || '';
			const swaggerEncoded = Buffer.from(JSON.stringify(swaggerJson)).toString('base64');
			const host = swaggerJson.host;
			const basePath = swaggerJson.basePath;
			const version = api.versionGroup || '0.1';
			const webhookUrl = this.config.webhookUrl || '';
			const icon = this.config.icon;
			const iconData = getIconData(icon);
			
			// Create Resource Definitions
			const apiService = {
				apiVersion: 'v1alpha1',
				kind: 'APIService',
				name: apiServiceName,
				title: displayName,
				attributes,
				metadata: {
					scope: {
						kind: 'Environment',
						name: environmentName
					}
				},
				spec: {
					description: apiDescription,
					icon: iconData
				}
			};
		
			const apiServiceRevision = {
				apiVersion: 'v1alpha1',
				kind: 'APIServiceRevision',
				name: apiServiceRevisionName,
				title: displayName,
				attributes,
				metadata: {
					scope: {
						kind: 'Environment',
						name: environmentName
					}
				},
				spec: {
					apiService: apiServiceName,
					definition: {
						type: 'oas2',
						value: swaggerEncoded
					}
				}
			};
		
			const apiServiceInstance = {
				apiVersion: 'v1alpha1',
				kind: 'APIServiceInstance',
				name: apiServiceName,
				title: displayName,
				attributes,
				metadata: {
					scope: {
						kind: 'Environment',
						name: environmentName
					}
				},
				spec: {
					apiServiceRevision: apiServiceRevisionName,
					endpoint: [
						{
							host: host,
							protocol: 'https',
							port: 443
						}
					]
				}
			};

			const consumerInstanceInstance = {
				apiVersion: 'v1alpha1',
				kind: 'ConsumerInstance',
				name: apiServiceName,
				title: displayName,
				attributes,
				metadata: {
					scope: {
						kind: 'Environment',
						name: environmentName
					}
				},
				spec: {
					apiServiceInstance: apiServiceName,
					state: 'PUBLISHED',
					subscription: {
						enabled: true,
						autoSubscribe: false,
						subscriptionDefinition: 'consumersubdef'
					},
					version: version,
					tags: (attributes ? Object.values(attributes) : [])
				}
			};
	
			if (basePath) {
				apiServiceInstance.spec.endpoint[0].routing = { basePath: basePath };
			}

			// Save to FS
			commitToFs(apiService, this.config.outputDir, [
				apiService,
				apiServiceRevision,
				apiServiceInstance,
				consumerInstanceInstance
			]);
		}
		return;
	}
}