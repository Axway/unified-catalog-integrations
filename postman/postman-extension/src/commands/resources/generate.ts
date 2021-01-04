//@ts-ignore
import { chalk, snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { Config } from "../../../types";
import { configFilePath } from "../../utils";
const PostmanService = require('../../service');

type args = {
  console: Console;
};

const { log } = snooplogg("postman-extension: resources: sync");

export const sync = {
  action: async ({ console }: args) => {
    log("Generating resources");
    const config: Config = readJsonSync(configFilePath);
    
    await new PostmanService(config).syncResources();
    
    console.log(chalk["yellow"](`Resources sync in workspace ${config.workspaceId}`));
  },
};
