import { outputJsonSync, pathExistsSync } from "fs-extra";
import { homedir } from "os";
import { join, resolve } from "path";
import * as fs from "fs";
const yaml = require("js-yaml");
const request = require("request");
const mime = require("mime-types");
const mkdir = require("mkdirp");

export const configFilePath = join(
  homedir(),
  ".axway",
  "swaggerhub-extension.json"
);
export const ensureConfigFileExists = () =>
  !pathExistsSync(configFilePath) && outputJsonSync(configFilePath, {});

// Creates a promise for a request
export const requestPromise = (options: any) => {
  return new Promise((resolve, reject) => {
    request(options, (err: any, response: any) => {
      if (err) reject(new Error(err));
      if (response.statusCode > 200)
        reject(new Error(`Bad response ${response.body}`));
      resolve(response.body);
    });
  });
};

// TODO: maybe use handlebars in the future instead of these objects
// TODO: what is a good default directory?
// Creates local yaml files given the resource params.
export const createResources = async (
  resourceParams: [any],
  outputDir: string = "./resources"
) => {
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
      endpoint,
      apiType,
      basePath,
      version,
      icon,
      title,
    } = opts;

    let iconData;
    let iconPath;
    let defaultIconPath = resolve(__dirname, "./assets/env_icon.png");

    // Use the custom abosolute icon path if provided/found
    if (fs.existsSync(icon)) {
      iconPath = icon;
    } else {
      iconPath = defaultIconPath;
    }
    iconData = {
      contentType: mime.lookup(iconPath),
      data: fs.readFileSync(iconPath, { encoding: "base64" }),
    };

    const environment = {
      apiVersion: "v1alpha1",
      title: `${environmentName} Environment`,
      name: environmentName,
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

    const apiService = {
      apiVersion: "v1alpha1",
      kind: "APIService",
      name: apiServiceName,
      title: displayName,
      attributes: {
        ...(attributes || {}),
      },
      metadata: {
        scope: {
          kind: "Environment",
          name: environmentName,
        },
      },
      spec: {
        description: apiDescription,
        icon: iconData,
      },
    };

    const consumerInstanceInstance = {
      apiVersion: "v1alpha1",
      kind: "ConsumerInstance",
      name: apiServiceName,
      title: displayName,
      attributes: {
        ...(attributes || {}),
      },
      metadata: {
        scope: {
          kind: "Environment",
          name: environmentName,
        },
      },
      spec: {
        apiServiceInstance: apiServiceName,
        state: "PUBLISHED",
        subscription: {
          enabled: true,
          autoSubscribe: false,
        },
        version: version,
        tags: attributes ? Object.values(attributes) : [],
      },
    };

    const apiServiceRevision = {
      apiVersion: "v1alpha1",
      kind: "APIServiceRevision",
      name: apiServiceRevisionName,
      title: title,
      attributes: {
        ...(attributes || {}),
      },
      metadata: {
        scope: {
          kind: "Environment",
          name: environmentName,
        },
      },
      spec: {
        apiService: apiServiceName,
        definition: {
          type: apiType,
          value: swaggerEncoded,
        },
      },
    };

    const apiServiceInstance = {
      apiVersion: "v1alpha1",
      kind: "APIServiceInstance",
      name: apiServiceName,
      title: displayName,
      attributes: {
        ...(attributes || {}),
      },
      metadata: {
        scope: {
          kind: "Environment",
          name: environmentName,
        },
      },
      spec: {
        apiServiceRevision: apiServiceRevisionName,
        endpoint: [endpoint],
      },
    };

    if (basePath) {
      // @ts-ignore
      apiServiceInstance.spec.endpoint[0].routing = { basePath: basePath };
    }

    // Build yaml files
    let supportResources = [environment].reduce(reducer, "---");

    let resources = [
      apiService,
      apiServiceRevision,
      apiServiceInstance,
      consumerInstanceInstance,
    ].reduce(reducer, "---");

    // write yaml files to outputDir
    await writeResource(apiService, outputDir, resources);
    await writeResource(environment, outputDir, supportResources);
  }
};

const writeResource = async (
  resource: any,
  directory: string,
  content: string
) => {
  await mkdir(directory);
  fs.writeFileSync(
    `${directory}/${resource.kind}-${resource.name}.yaml`,
    content
  );
};

const reducer = (acc = "", cur: any) => {
  const sep = "---";
  const docSep = acc === sep ? "" : sep;
  return `${acc}\n${docSep}\n${yaml.dump(cur)}`;
};
