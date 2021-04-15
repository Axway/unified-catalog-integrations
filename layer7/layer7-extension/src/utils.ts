import * as fs from "fs";
import { outputJsonSync, pathExistsSync } from "fs-extra";
import yaml from "js-yaml";
import mime from "mime-types";
import { homedir } from "os";
import { join, resolve } from "path";
const request = require('request');

export const configFilePath = join(homedir(), ".axway", "layer7-extension.json");
export const ensureConfigFileExists = () => !pathExistsSync(configFilePath) && outputJsonSync(configFilePath, {});

// Get the icon data
export const getIconData = (icon: string) => {
  let iconData;
  let iconPath;
  let defaultIconPath = resolve(__dirname, "./assets/layer7.png");

  // Use the custom absolute icon path if provided/found
  if (fs.existsSync(icon)) {
    iconPath = icon;
  } else {
    iconPath = defaultIconPath;
  }
  iconData = {
    contentType: mime.lookup(iconPath),
    data: fs.readFileSync(iconPath, { encoding: "base64" }),
  };
  return iconData;
};

export const createSupportResource = async (config: any) => {
  const { environmentName, icon, outputDir, webhookUrl } = config;

  let iconData = getIconData(icon);

  const environment = {
    apiVersion: "v1alpha1",
    title: `${environmentName} Environment`,
    name: environmentName.toLowerCase().replace(/\W+/gm, "-"),
    kind: "Environment",
    attributes: {
      createdBy: "yaml",
      randomNum: 1,
    },
    tags: ["axway", "cli"],
    spec: {
      description: `${environmentName} Environment`,
      icon: iconData,
    },
  };

  const webhook = {
		apiVersion: "v1alpha1",
		title: "webhook1 title",
		name: "ibflow",
		kind: "Webhook",
		metadata: {
			scope: {
				kind: "Environment",
				name: environmentName,
			},
		},
		attributes: {
			target: "ibflow",
		},
		tags: ["webhook", "cli", "axway"],
		spec: {
			enabled: true,
			url: webhookUrl,
			headers: {
				"Content-Type": "application/json",
			}
		}
  };
  
  const subscriptionDefinition = {
		apiVersion: 'v1alpha1',
		title: 'Invoke IB Flow for approval',
		name: 'consumersubdef',
		kind: 'ConsumerSubscriptionDefinition',
		metadata: {
			scope: {
				kind: 'Environment',
				name: environmentName
			}
		},
		tags: ['subDefinition', 'cli', 'axway'],
		spec:
		{
			webhooks: ['ibflow']
		}
	};



  //write yaml files to outputDir
  await commitToFs(environment, outputDir, [environment, webhook, subscriptionDefinition]);
};

// Given a properly ordered array of resource defs, create 1 yaml str
export const createYamlStr = (resources: Array<any>) => {
  return resources.reduce((acc = "", cur: any) => {
    const sep = "---";
    const docSep = acc === sep ? "" : sep;
    return `${acc}\n${docSep}\n${yaml.dump(cur)}`;
  }, "---");
};

// Write resource to file
export const writeResource = async (resource: any, directory: string, content: string) => {
  directory = directory[0] === "~" ? join(homedir(), directory.substr(1)) : directory;
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(`${directory}/${resource.kind}-${resource.name}.yaml`, content);
};

export const commitToFs = async (resource: any, outputDir: string | boolean, resources: Array<any>) => {
  outputDir = typeof outputDir === "string" ? outputDir : "./resources";
  await writeResource(resource, outputDir, createYamlStr(resources));
};

// Creates a promise for a request 
export const requestPromise = (options: any) => {
  return new Promise((resolve, reject) => {
    request(options, (err: any, response: any) => {
      if (err) {
				return reject(new Error(err));
			} else if (response.statusCode > 200) {
				return reject(new Error(`Bad response ${response.body}`))
			}
      resolve(response.body);
    });
  });
};

export const isOASExtension = (filename: string)  => {
  if (["package-lock.json", "package.json", ".travis.yml", "fixup.yaml", "jpdiff.yaml"].includes(filename)) {
    return false;
  }
  const pattern = /\.(yaml|yml|json)$/i;
  return pattern.test(filename);
}