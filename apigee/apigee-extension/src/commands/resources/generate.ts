//@ts-ignore
import { snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { configFilePath, createResources } from "../../utils";
const ApigeeService = require('../../apigeeService.js');

type args = {
  argv: { json: boolean };
  console: Console;
};

const { log } = snooplogg("apigee-extension: resources: generate");

export const generate = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    const apigeeService = new ApigeeService(config, log)

    // fetch & generate assets
    await createResources({name: config.environmentName, icon: config.icon}, await apigeeService.fetch(), config.outputDir);

    console.log(`Resources created in ${config.outputDir}`);
    console.log(`Upload example: 'amplify central create -f=<path to resource>'`);
  },
};
