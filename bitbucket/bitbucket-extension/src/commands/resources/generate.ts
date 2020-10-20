//@ts-ignore
import { chalk, snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { BitbucketService } from "../../service";
import { configFilePath, createEnvironmentResource } from "../../utils";

type args = {
  console: Console;
};

const { log } = snooplogg("bitbucket-extension: resources: generate");

export const generate = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    config.outputDir = typeof config.outputDir === "string" ? config.outputDir : "./resources";
    await new BitbucketService(config).generateResources();
    await createEnvironmentResource(config);
    console.log(chalk["yellow"](`Resources created in ${config.outputDir}`));
    console.log(chalk["yellow"]("Upload example: 'amplify central create -f=<path to resource>'\n"));
  },
};
