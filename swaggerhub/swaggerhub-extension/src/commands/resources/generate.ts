//@ts-ignore
import { snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { configFilePath, createResources } from "../../utils";
const SwaggerHubService = require("../../SwaggerHubService.js");

type args = {
  argv: { json: boolean };
  console: Console;
};

const { log } = snooplogg("swaggerhub-extension: resources: generate");

export const generate = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    const swaggerHubService = new SwaggerHubService(config, log);
    // fetch & generate assets
    await createResources(await swaggerHubService.fetch(), config.outputDir);

    console.log(`Resources created in ${config.outputDir}`);
    console.log(
      `Upload example: 'amplify central create -f=<path to resource>'`
    );
  },
};
