//@ts-ignore
import { snooplogg } from "cli-kit";
import { outputJsonSync, readJsonSync } from "fs-extra";
import { Config, ConfigKeys } from "../../../types";
import { configFilePath } from "../../utils";

type args = {
  argv: Partial<Config>;
  console: Console;
};

const { log } = snooplogg("swaggerhub-extension: config: set");

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
  desc: "Set AMPLIFY Central swaggerhub-extension configuration",
  aliases: ["set"],
  options: {
    "--owner [value]": "Required: Set your Swagger Hub owner name",
    "--root-url [value]": "Set Swagger Hub root url. Defaults to https://api.swaggerhub.com/apis/",
    "--output-dir [value]": "Set absolute path for output directory",
    "--environment-name [value]": "Required: Set environment name to create",
    "--icon [value]": "Set absolute path for custom icon",
  },
};
