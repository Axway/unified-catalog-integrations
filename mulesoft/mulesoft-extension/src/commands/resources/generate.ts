//@ts-ignore
import { snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { configFilePath, createSupportResources } from "../../utils";
const { generateResources } = require('../../mulesoftService.js');

type args = {
  argv: { json: boolean };
  console: Console;
};

const { log } = snooplogg("mulesoft-extension: resources: generate");

export const generate = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    await generateResources(config, log);
    await createSupportResources(config);
    console.log(`Resources created in ${config.outputDir}`);
    console.log(`Upload example: 'amplify central create -f=<path to resource>'`);
  },
};
