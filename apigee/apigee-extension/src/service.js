const fs = require('fs');
const yaml = require('js-yaml');
const { requestPromise, commitToFs } = require('./utils');
import { loadConfig } from '@axway/amplify-config';

module.exports =  class ApigeeService {
	constructor(config, log) {
		this.config = config || {};
		this.proxySettings = {};
		this.log = log;
		let missingParam = [
			'organizationId',
			'username',
			'password',
			'environmentName',
		].reduce((acc, cur) => {
			if (!this.config[cur]) {
				acc.push(cur);
				return acc;
			}
			return acc;
		}, []);

		if (missingParam.length) {
			console.log(`Missing required config: [${missingParam.join(', ')}]. Run 'amplify central apigee-extension config set -h' to see a list of params`);
			return process.exit(1);
		}

		const networkSettings = loadConfig().get('network') || {};
		const strictSSL = networkSettings.strictSSL || {};
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
			organizationId,
			username,
			password,
		} = this.config;
		
		this.requestSettings = {
			apigeeAuth: {
				method: 'POST',
				url: `https://login.apigee.com/oauth/token`,
				headers: {
					'Content-Type': ['application/x-www-form-urlencoded'],
					Authorization: 'Basic ZWRnZWNsaTplZGdlY2xpc2VjcmV0' //this is hardcoded to edgecli:edgeclisecret
				},
				form: {
					grant_type: 'password',
					username: username,
					password: password
				}
			},
			// get all APIs
			APIsOptions: (token) => ({
				method: 'GET',
				url: `https://api.enterprise.apigee.com/v1/organizations/${organizationId}/apis`,
				headers: { Authorization: `Basic ${token}` }
			}),
			environments: (token) => ({
				method: 'GET',
				url: `https://api.enterprise.apigee.com/v1/organizations/${organizationId}/environments`,
				headers: { Authorization: `Basic ${token}`, Accept: 'application/json' }
			}),
			revisionDetails: (apiName, revisionNumber, token) => ({
				method: 'GET',
				url: `https://api.enterprise.apigee.com/v1/organizations/${organizationId}/apis/${apiName}/revisions/${revisionNumber}`,
				headers: { Authorization: `Basic ${token}` }
			}),
			resourceFiles: (apiName, revisionNumber, token) => ({
				method: 'GET',
				url: `https://api.enterprise.apigee.com/v1/organizations/${organizationId}/apis/${apiName}/revisions/${revisionNumber}/resourcefiles`,
				headers: { Authorization: `Basic ${token}` }
			}),
			revisionSpec: (apiName, revisionNumber, specFile, token) => ({
				method: 'GET',
				url: `https://api.enterprise.apigee.com/v1/organizations/${organizationId}/apis/${apiName}/revisions/${revisionNumber}/resourcefiles/openapi/${specFile}`,
				headers: { Authorization: `Basic ${token}` }
			}),
			deployments: (apiName, token) => ({
				method: 'GET',
				url: `https://api.enterprise.apigee.com/v1/organizations/${organizationId}/apis/${apiName}/deployments`,
				headers: { Authorization: `Basic ${token}` }
			}),
			hosts: (envName, token) => ({
				method: 'GET',
				url: `https://api.enterprise.apigee.com/v1/organizations/${organizationId}/environments/${envName}/virtualhosts`,
				headers: { Authorization: `Basic ${token}` }
			}),
			virtualHosts: (envName, virtualHostName, token) => ({
				method: 'GET',
				url: `https://api.enterprise.apigee.com/v1/organizations/${organizationId}/environments/${envName}/virtualhosts/${virtualHostName}`,
				headers: { Authorization: `Basic ${token}` }
			}),
			swagger: (specPath, token) => ({
				method: 'GET',
				url: `https://apigee.com${specPath}`,
				headers: { Authorization: `Bearer ${token}` }
			})
		}
	}

	async generateResources() {
		const token = Buffer.from(this.config.username + ':' + this.config.password).toString('base64');
		console.log('Logging into APIGEE');
		const acccessToken = JSON.parse(await this._authorize()).access_token;
		console.log('Building Resources');
		return this._buildAssetParams(token, acccessToken);
	}
	
	// Authorize
	async _authorize() {
		this.log('Generating access token');
		return requestPromise({
			...this.requestSettings.apigeeAuth,
			...this.proxySettings
		});
	};

	// List APIS from apigee
	async _listAPIs(token) {
		return requestPromise({
			...this.requestSettings.APIsOptions(token),
			...this.proxySettings
		});
	};

	// Get api revision details
	async _apiRevisionDetails(token, apiName, revisionNumber) {
		return requestPromise({
			...this.requestSettings.revisionDetails(apiName, revisionNumber, token),
			...this.proxySettings
		})
	};

	// Get a list of resource files
	async _apiResourceFiles(token, apiName, revisionNumber) {
		return requestPromise({
			...this.requestSettings.resourceFiles(apiName, revisionNumber, token),
			...this.proxySettings
		});
	};

	// Get openapi spec association
	async _apiRevisionSpecAssociation(token, apiName, revisionNumber, specFile) {
		return requestPromise({
			...this.requestSettings.revisionSpec(apiName, revisionNumber, specFile, token),
			...this.proxySettings
		});
	};

	// List all virtual hosts for environment
	async _listAPIDeployments(token, apiName) {
		return requestPromise({
			...this.requestSettings.deployments(apiName, token),
			...this.proxySettings
		});
	};

	// List all the environments
	async _listEnvironments(token) {
		return requestPromise({
			...this.requestSettings.environments(token),
			...this.proxySettings
		})
	};

	// List all virtual hosts for environment
	async _listVirtualHostsForEnvironment(token, envName) {
		return requestPromise({
			...this.requestSettings.hosts(envName, token),
			...this.proxySettings
		});
	};

	// Get virtual hosts details
	async _listVirtualHostDetailsForEnvironment(token, envName, virtualHostName) {
		return requestPromise({
			...this.requestSettings.virtualHosts(envName, virtualHostName, token),
			...this.proxySettings
		});
	};

	// Get swagger for an API def
	async _getSwagger(specPath, token) {
		return requestPromise({
			...this.requestSettings.swagger(specPath, token),
			...this.proxySettings
		});
	};

	// Load all environments virtual hosts
	async _getVirtualHostsPerEnv(token) {
		this.log('Loading virtual hosts')
		const virtualHostsPerEnvironment = new Map();
		//get a list of all environments and virtual hosts
		const environments = JSON.parse(await this._listEnvironments(token));
		for (let env of environments) {
			this.log(`Processing env ${JSON.stringify(env)}`);
			//get the virtual hosts
			const virtualHosts = await this._listVirtualHostsForEnvironment(token, env);
			let vhostDetails = [];
			for (let vhost of JSON.parse(virtualHosts)) {
				let vHostDetails = await this._listVirtualHostDetailsForEnvironment(token, env, vhost);
				vhostDetails.push(JSON.parse(vHostDetails));
			}
			virtualHostsPerEnvironment.set(env, vhostDetails);
		}
		return virtualHostsPerEnvironment;
	}

	// take the api info and the config info and prep data for generating yaml files
	async _buildAssetParams(token, acccessToken) {
		const virtualHostsPerEnvironment = await this._getVirtualHostsPerEnv(token);
		this.log(`Fetching apis from org \"${this.config.organizationId}\"`);
		const apis = JSON.parse(await this._listAPIs(token));
		
		let generatedResources = [];
		for (let api of apis) {
			const resources = [];
			this.log(`Generating resources for api ${api}`);
			const apiServiceName = api.toLowerCase().replace(/\W+/g, '-');
			//create the api service
			const apiService = {
				apiVersion: 'v1alpha1',
				kind: 'APIService',
				name: apiServiceName,
				attributes: {
					apiName: api
				},
				metadata: {
					scope: {
						kind: 'Environment',
						name: this.config.environmentName
					}
				},
				spec: {}
			};

			resources.push(apiService);
			//fetch all the revisions that are deployed
			const deployments = JSON.parse(await this._listAPIDeployments(token, api));
			
			const deployedRevisions = [];
			for (let apiEnv of deployments.environment) {
				const deplEnvName = apiEnv.name;
				const revs = apiEnv.revision.filter(rev => rev.state === 'deployed').map(rev => rev.name);
				deployedRevisions.push({
					name: deplEnvName,
					revisions: revs
				});
			}
	
			//for each deployed revision, create an api service revision
			for (var entry of deployedRevisions) {
				var envName = entry.name,
					revisions = entry.revisions;

				this.log(`API ${api} deployed on ${envName} for revision ${revisions}`);
	
				for (var revision of revisions) {
					//check if there is an asset for the revision
					const resourceFiles = JSON.parse(await this._apiResourceFiles(token, api, revision));
					const revisionDetails = JSON.parse(await this._apiRevisionDetails(token, api, revision));
	
					const path = resourceFiles.resourceFile.filter(res => res.type === 'openapi').map(res => res.name);
	
					let swaggerJson;
					let swaggerEncoded;
					if (path && path.length > 0) {
						let specPath = JSON.parse(await this._apiRevisionSpecAssociation(token, api, revision, path[0]));
						if (specPath && specPath.url) {
							this.log(`Fetching swagger for ${api}`);
							const swagger = await this._getSwagger(specPath.url, acccessToken);
							swaggerJson = JSON.parse(swagger);
						}
					} else {
						this.log(`No OAS found for api ${api}. Generating an empty OAS2 spec.`)
						swaggerJson = {
							swagger: "2.0",
							info: {
							  title: "",
							  version: ""
							},
							schemes: [],
							paths: {}
						  }
					}
					swaggerEncoded = Buffer.from(JSON.stringify(swaggerJson)).toString('base64');
					const apiServiceRevisionName = `${apiServiceName}-${envName}-${revision}`;
	
					const apiServiceRevision = {
						apiVersion: 'v1alpha1',
						kind: 'APIServiceRevision',
						name: apiServiceRevisionName,
						title: revisionDetails.contextInfo,
						attributes: {
							apiName: api,
							environment: envName
						},
						metadata: {
							scope: {
								kind: 'Environment',
								name: this.config.environmentName
							}
						},
						spec: {
							apiService: apiServiceName,
							definition: {
								type: swaggerJson.swagger ? 'oas2' : 'oas3',
								value: swaggerEncoded
							}
						}
					};
					resources.push(apiServiceRevision);
	
					//generate the api service instance
					let envHosts = virtualHostsPerEnvironment.get(envName);
					for (var envHost of envHosts) {
						let apiServiceInstanceName = `${apiServiceRevisionName}-${envHost.name}`;
						let basePath = revisionDetails.basepaths && revisionDetails.basepaths.length > 0 ? revisionDetails.basepaths[0] : "/"; 
						let endpoints = envHost.hostAliases.map(hostAlias => {
							let result = {
								host: hostAlias,
								protocol: envHost.sSLInfo ? 'https' : 'http',
								port: parseInt(envHost.port, 10),
								routing: {
									basePath: basePath
								}
							};
							return result;
						});
						const apiServiceInstance = {
							apiVersion: 'v1alpha1',
							kind: 'APIServiceInstance',
							name: apiServiceInstanceName,
							attributes: {
								apiName: api,
								environment: envName
							},
							metadata: {
								scope: {
									kind: 'Environment',
									name: this.config.environmentName
								}
							},
							spec: {
								apiServiceRevision: apiServiceRevisionName,
								endpoint: endpoints
							}
						};
						resources.push(apiServiceInstance);
						const consumerInstanceInstance = {
							apiVersion: 'v1alpha1',
							kind: 'ConsumerInstance',
							name: apiServiceInstanceName,
							attributes: apiServiceInstance.attributes,
							metadata: {
								scope: {
									kind: 'Environment',
									name: this.config.environmentName
								}
							},
							spec: {
								apiServiceInstance: apiServiceInstanceName,
								state: 'PUBLISHED',
								description: revisionDetails.description,
								subscription: {
									enabled: false,
									autoSubscribe: false
								},
								version: `${revisionDetails.configurationVersion.majorVersion}.${revisionDetails.configurationVersion.minorVersion}`
							}
						};
						resources.push(consumerInstanceInstance);
					}
				}
			}
			commitToFs(apiService, this.config.outputDir, resources)
		}
	}
}