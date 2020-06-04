import { outputJsonSync, pathExistsSync } from "fs-extra";
import { homedir } from "os";
import { join, resolve } from "path";
import * as fs from "fs";
const yaml = require('js-yaml');
const request = require('request');
const mime = require('mime-types');
const mkdir = require("mkdirp");

export const configFilePath = join(homedir(), ".axway", "apigee-extension.json");
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
export const createResources = async (environmentConfig: any, resourceParams: [any], outputDir: string = './resources') => {
	// write environment resource - webhook and subscription definitions are not used for apigee
	let iconData;
	let iconPath;
	let defaultIconPath = resolve(__dirname, './assets/env_icon.png');
	// Use the custom abosolute icon path if provided/found
	if (fs.existsSync(environmentConfig.icon)) {
		iconPath = environmentConfig.icon;
	} else {
		iconPath = defaultIconPath;
	}
	iconData = {
		contentType: mime.lookup(iconPath),
		data: fs.readFileSync(iconPath, { encoding: 'base64' })
	}
	const environment = {
		apiVersion: 'v1alpha1',
		title: `${environmentConfig.name} Environment`,
		name: environmentConfig.name,
		kind: 'Environment',
		tags: [ 'axway', 'cli' ],
		spec: {
			description: `${environmentConfig.name} Environment`,
			icon: iconData
		}
	}

	//write the environment resource
	await commitToFs(environment, outputDir, [
		environment,
	]);

	//write each set of resources in its file
	for (let i = 0; i < resourceParams.length; i++) {
		const resourceGroup = resourceParams[i];
		// Build yaml files and commit to fs
		await writeResources(resourceGroup.name, outputDir, resourceGroup.resources);
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
export const writeResources = async (fileName: string, directory: string, resources: Array<any>) => {
	await mkdir((directory));
	fs.writeFileSync(`${directory}/${fileName}.yaml`, createYamlStr(resources));
};


export const commitToFs = async (resource: any, outputDir: string, resources: Array<any>) => {
	await writeResources(`${resource.kind}-${resource.name}`, outputDir, resources)
}

