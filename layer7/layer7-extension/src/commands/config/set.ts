//@ts-ignore
import { snooplogg } from "cli-kit";
import { outputJsonSync, readJsonSync } from "fs-extra";
import { Config, ConfigKeys } from "../../../types";
import { configFilePath } from "../../utils";

type args = {
  argv: Partial<Config>;
  console: Console;
};

const { log } = snooplogg("layer7-extension: config: set");

export const set = {
  action: ({ argv }: args) => {
    log("Setting config");
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
  },
  desc: "Set AMPLIFY Central layer7-extension configuration",
  aliases: ["set"],
  options: {
    "--output-dir [value]": "Set absolute path for output directory",
    "--environment-name [value]": "Required: Set environment name to create",
    "--icon [value]": "Set absolute path for custom icon",
    "--client-id [value]": "Required: Client id for fetching APIs",
    "--client-secret [value]": "Required: Client secret for fetching APIs",
    "--base-url [value]": "Required: Portal baseurl",
    "--webhook-url [value]": "Required: Set webhook url to use"
  },
};
