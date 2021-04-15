//@ts-ignore
import { chalk, snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { configFilePath, createEnvironmentResource } from "../../utils";
const BitbucketService = require('../../service');

type args = {
  console: Console;
};

const { log } = snooplogg("bitbucket-extension: resources: generate");

export const generate = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    config.outputDir = typeof config.outputDir === "string" ? config.outputDir : "./resources";
    await createEnvironmentResource(config);
    await new BitbucketService(config).generateResources();
    console.log(chalk["yellow"](`Resources created in ${config.outputDir}`));
    console.log(chalk["yellow"]("Upload example: 'axway central create -f=<path to resource>'\n"));
  },
};
