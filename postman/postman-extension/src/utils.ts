import { outputJsonSync, pathExistsSync } from "fs-extra";
import { homedir } from "os";
import { join } from "path";
const request = require('request');

export const configFilePath = join(homedir(), ".axway", "postman-extension.json");
export const ensureConfigFileExists = () => !pathExistsSync(configFilePath) && outputJsonSync(configFilePath, {});

// Creates a promise for a request 
export const requestPromise = (options: any) => {
  return new Promise((resolve, reject) => {
    request(options, (err: any, response: any) => {
      if (err) {
				return reject(new Error(err));
			} else if (response.statusCode > 200) {
				return reject(new Error(`Bad response ${JSON.stringify(response.body)}`))
			}
      resolve(response.body);
    });
  });
};