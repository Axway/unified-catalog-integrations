//@ts-ignore
import { chalk, snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { configFilePath, createSupportResource } from "../../utils";
const Layer7Service = require('../../service');

type args = {
  console: Console;
};

const { log } = snooplogg("layer7-extension: resources: generate");

export const generate = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    config.outputDir = typeof config.outputDir === "string" ? config.outputDir : "./resources";
    await createSupportResource(config);
    await new Layer7Service(config).generateResources();
    console.log(chalk["yellow"](`Resources created in ${config.outputDir}`));
    console.log(chalk["yellow"]("Upload example: 'amplify central create -f=<path to resource>'\n"));
  },
};
