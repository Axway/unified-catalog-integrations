const request = require('request');
const fs = require('fs');
const yaml = require('js-yaml');
const { requestPromise } = require('./utils');

module.exports =  class AzureService {
	constructor(config, log) {
		// TODO: config validation for required params
		this.config = config || {};
		this.log = log;
		const {
			tenantId,
			clientId,
			clientSecret,
			subscriptionId,
			resourceGroupName,
			serviceName,
			filter
		} = this.config;

		if (!tenantId || !clientId || !clientSecret || !subscriptionId || !resourceGroupName || !serviceName) {
			console.log("Missing required config. Run 'amplify central azure-extension config set -h' to see a list of required params");
			process.exit(1);
		}

		// Request settings for fetching apis
		let filterString = ''
		if (filter) {
			filterString = `&${filter.split(',').reduce((acc = '', curr) => `&${acc}&${curr}`)}`
		}
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
				}
			},
			getAPIs: {
				method: 'GET',
				url: `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${serviceName}/apis?api-version=2019-01-01&$top=100${filterString}`
			},
			getSwagger: (name, token) => ({
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` },
				url: `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${serviceName}/apis/${name}?export=true&format=swagger&api-version=2019-01-01`
			})
		}
	}

	// login and fetch the apis from azure
	async fetch() {
		const token = JSON.parse(await this._authorize()).access_token;
		const apis = JSON.parse(await this._listAPIs(token));
		return this._buildAssetParams(apis, token);
	}

	// auth azure
	_authorize() {
		this.log('logging into azure')
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
	async _buildAssetParams (apis, token) {
		const assetParams = [];
		for (let api of apis.value) {
			const swagger = await this._getSwagger(api.name, token);
			const swaggerJson = JSON.parse(swagger).value;
			const swaggerEncoded = Buffer.from(JSON.stringify(swaggerJson)).toString('base64');
			const apiServiceName = `${api.name}`;
			const apiServiceRevisionName = `${apiServiceName}-${api.properties.apiRevision}`;
			const apiProperties = api && api.properties || {};

			assetParams.push({
				apiServiceName,
				apiServiceRevisionName,
				displayName: apiProperties.displayName || '',
				attributes: {
					azureServiceName: this.config.serviceName,
					azureResourceGroupName: this.config.resourceGroupName,
					azureApiName: apiServiceName
				},
				environmentName: this.config.environmentName,
				apiDescription: apiProperties.description || '',
				swaggerEncoded,
				host: swaggerJson.host,
				basePath: swaggerJson.basePath,
				version: api.versionGroup || '0.1',
				webhookUrl: this.config.webhookUrl || '',
				...(this.config.icon ? { icon: this.config.icon} : {})
			});
		}
		return assetParams;
	}
}