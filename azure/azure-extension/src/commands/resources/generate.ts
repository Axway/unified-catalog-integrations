//@ts-ignore
import { snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { configFilePath, createSupportResources } from "../../utils";
const AzureService = require('../../service.js');
const chalk = require('chalk');

type args = {
  console: Console;
};

const { log } = snooplogg("azure-extension: resources: generate");

export const generate = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    config.outputDir = typeof config.outputDir === 'string' ? config.outputDir : './resources';
    const azureService = new AzureService(config, log)

    // fetch & generate assets
    await createSupportResources(config);
    await azureService.generateResources(config);

    console.log(chalk['yellow'](`Resources created in ${config.outputDir}`));
    console.log(chalk['yellow']("Upload example: 'axway central create -f=<path to resource>'\n"));
  },
};
