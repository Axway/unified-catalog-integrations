import { outputJsonSync, pathExistsSync } from "fs-extra";
import { homedir } from "os";
import { join, resolve } from "path";
import * as fs from "fs";
const yaml = require('js-yaml');
const request = require('request');
const mime = require('mime-types');
const mkdir = require("mkdirp");

export const configFilePath = join(homedir(), ".axway", "azure-extension.json");
export const ensureConfigFileExists = () => !pathExistsSync(configFilePath) && outputJsonSync(configFilePath, {});

// Creates a promise for a request 
export const requestPromise = (options: any) => {
  return new Promise((resolve, reject) => {
    request(options, (err: any, response: any) => {
      if (err) reject(new Error(err));
      if (response.statusCode > 200) reject(new Error(`Bad response ${response.body}`))
      resolve(response.body);
    });
  });
};

// TODO: maybe use handlebars in the future instead of these objects
// TODO: what is a good default directory?
// Creates local yaml files given the resource params.
export const createResources = async (resourceParams: [any], outputDir: string = './resources') => {
	for (let i = 0; i < resourceParams.length; i++) {
		const opts = resourceParams[i];
		const {
			apiServiceName,
			apiServiceRevisionName,
			displayName,
			attributes,
			environmentName,
			apiDescription,
			swaggerEncoded,
			host,
			basePath,
			version,
			icon,
			webhookUrl
		} = opts;

		let iconData;
		let iconPath;
		let defaultIconPath = resolve(__dirname, './assets/env_icon.png');

		// Use the custom abosolute icon path if provided/found
		if (fs.existsSync(icon)) {
			iconPath = icon;
		} else {
			iconPath = defaultIconPath;
		}
		iconData = {
			contentType: mime.lookup(iconPath),
			data: fs.readFileSync(iconPath, { encoding: 'base64' })
		}

		const environment = {
			apiVersion: 'v1alpha1',
			title: `${environmentName} Environment`,
			name: environmentName,
			kind: 'Environment',
			attributes: {
				createdBy: 'yaml',
				randomNum: 1
			},
			tags: [ 'axway', 'cli' ],
			spec: {
				description: `${environmentName} Environment`,
				icon: iconData
			}
		}

		const subscriptionDefinition = {
			apiVersion: 'v1alpha1',
			title: 'Invoke msflow Flow for approval',
			name: 'consumersubdef',
			kind: 'ConsumerSubscriptionDefinition',
			metadata: {
				scope: {
					kind: 'Environment',
					name: environmentName
				 }
			},
			tags: [ 'apisvcinst', 'cli', 'axway' ],
			spec: 
			{
				webhooks: [ 'msflow' ],
				schema: {
					properties: [ {
						key: 'profile', value: {} 
					} ] 
				}
			}
		};

		const webhook = {
			apiVersion: 'v1alpha1',
			title: 'webhook1 title',
			name: 'msflow',
			kind: 'Webhook',
			metadata: {
				scope: {
					kind: 'Environment', name: environmentName 
				}
			},
			attributes: {
				target: 'msflow'
			},
			tags: [ 'webhook', 'cli', 'axway' ],
			spec: {
				enabled: true,
				url: webhookUrl,
				headers: {
					'Content-Type': 'application/json' 
				}
			}
		}
		
		const apiService = {
			apiVersion: 'v1alpha1',
			kind: 'APIService',
			name: apiServiceName,
			title: displayName,
			attributes: {
				...(attributes || {})
			},
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
	
		const consumerInstanceInstance = {
			apiVersion: 'v1alpha1',
			kind: 'ConsumerInstance',
			name: apiServiceName,
			title: displayName,
			attributes: {
				...(attributes || {})
			},
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
	
		const apiServiceRevision = {
			apiVersion: 'v1alpha1',
			kind: 'APIServiceRevision',
			name: apiServiceRevisionName,
			title: displayName,
			attributes: {
				...(attributes || {})
			},
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
			attributes: {
				...(attributes || {})
			},
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

		if (basePath) {
			// @ts-ignore
			apiServiceInstance.spec.endpoint[0].routing = { basePath: basePath };
		}

		// Build and commit yaml files to fs
		await commitToFs(apiService, outputDir, [
			apiService,
			apiServiceRevision,
			apiServiceInstance,
			consumerInstanceInstance
		]);

		await commitToFs(environment, outputDir, [
			environment,
			webhook,
			subscriptionDefinition
		]);
	}
}

// Given an properly orderd array of resource defs, create 1 yaml str
export const createYamlStr = (resources: Array<any>) => {
	return resources.reduce((acc = '', cur: any) => {
		const sep = '---';
		const docSep = acc === sep ? '' : sep
		return `${acc}\n${docSep}\n${yaml.dump(cur)}`
	}, '---');
}

// Write resource to file
export const writeResource = async (resource: any, directory: string, content: string) => {
	await mkdir((directory));
	fs.writeFileSync(`${directory}/${resource.kind}-${resource.name}.yaml`, content);
};

export const commitToFs = async (resource: any, outputDir: string, resources: Array<any>) => {
	await writeResource(resource, outputDir, createYamlStr(resources))
}
