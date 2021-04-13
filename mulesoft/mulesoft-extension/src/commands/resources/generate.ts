//@ts-ignore
import { snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { configFilePath, createSupportResources } from "../../utils";
const chalk = require('chalk');

const Service = require('../../service.js');

type args = {
  console: Console;
};

const { log } = snooplogg("mulesoft-extension: resources: generate");

export const generate = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    config.outputDir = typeof config.outputDir === 'string' ? config.outputDir : './resources';
    const service = new Service(config)
    await createSupportResources(config);
    await service.generateResources(config);
    console.log(chalk['yellow'](`Resources created in ${config.outputDir}`));
    console.log(chalk['yellow']("Upload example: 'amplify central create -f=<path to resource>'\n"));
  },
};
