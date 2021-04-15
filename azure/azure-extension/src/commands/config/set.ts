//@ts-ignore
import { snooplogg } from "cli-kit";
import { outputJsonSync, readJsonSync } from "fs-extra";
import { Config, ConfigKeys } from "../../../types";
import { configFilePath } from "../../utils";

type args = {
  argv: Partial<Config>;
  console: Console;
};

const { log } = snooplogg("azure-extension: config: set");

export const set = {
  action: ({ argv }: args) => {
    log("Setting config");
    if (Object.values(ConfigKeys).some((k) => (Object.keys(argv) as Array<keyof Config>).includes(k))) {
      const config: Partial<Config> = readJsonSync(configFilePath);
      (Object.keys(argv) as Array<keyof Config>).forEach((k) => {
        const isConfig = Object.values(ConfigKeys).includes(k);
        if (isConfig && argv[k] !== undefined) {
          log(`Overriding config for ${k}`);
          log(`Current: ${config[k]}. New: ${argv[k]}`);
          config[k] = argv[k];
        }
      });

      log(`Writing updated config file: ${configFilePath}`);
      outputJsonSync(configFilePath, config);
    } else throw new Error("Missing required configuration properties to set");
  },
  desc: "Set AMPLIFY Central azure-extension configuration",
  aliases: ["set"],
  options: {
    "--client-id [value]": "Required: Set your Azure Client ID",
    "--client-secret [value]": "Required: Set your Azure Client Secret",
    "--tenant-id [value]": "Required: Set your Azure Tenant ID",
    "--subscription-id [value]": "Required: Set your Azure Subscription ID",
    "--resource-group-name [value]": "Required: Set your Azure Resource Group Name",
    "--service-name [value]": "Required: Set your Azure Service Name",
    "--filter [value]": "Set your filtering options, currently only supports a tag. Ex: --filter tags=myTag",
    "--output-dir [value]": "Set absolute path for output directory",
    "--environment-name [value]": "Required: Set environment name to create",
    "--webhook-url [value]": "Set webhook url to use",
    "--icon [value]": "Set absolute path for custom icon",
  },
};
