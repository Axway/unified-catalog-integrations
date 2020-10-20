import * as fs from "fs";
import { outputJsonSync, pathExistsSync } from "fs-extra";
import yaml from "js-yaml";
import mime from "mime-types";
import { homedir } from "os";
import { join, resolve } from "path";

export const configFilePath = join(homedir(), ".axway", "bitbucket-extension.json");
export const ensureConfigFileExists = () => !pathExistsSync(configFilePath) && outputJsonSync(configFilePath, {});

// Get the icon data
export const getIconData = (icon: string) => {
  let iconData;
  let iconPath;
  let defaultIconPath = resolve(__dirname, "./assets/bitbucket.jpg");

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

export const createEnvironmentResource = async (config: any) => {
  const { environmentName, icon, outputDir } = config;

  let iconData = getIconData(icon);

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

  //write yaml files to outputDir
  await commitToFs(environment, outputDir, [environment]);
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
