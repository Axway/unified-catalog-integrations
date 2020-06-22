//@ts-ignore
import { snooplogg } from "cli-kit";
import { outputJsonSync, readJsonSync } from "fs-extra";
import { Config, ConfigKeys } from "../../../types";
import { configFilePath } from "../../utils";

type args = {
  argv: Partial<Config>;
  console: Console;
};

const { log } = snooplogg("mulesoft-extension: config: set");

export const set = {
  action: ({ argv }: args) => {
    log("Setting config");
    const config: Partial<Config> = readJsonSync(configFilePath);
    (Object.keys(argv) as Array<keyof Config>).forEach((k) => {
      if (Object.values(ConfigKeys).includes(k)) {
        log(`Overriding config for ${k}`);
        log(`Current: ${config[k]}. New: ${argv[k]}`);
        config[k] = argv[k];
      }
    });

    log(`Writing updated config file: ${configFilePath}`);
    outputJsonSync(configFilePath, config);
  },
  desc: "Set AMPLIFY Central mulesoft-extension configuration",
  aliases: ["set"],
  options: {
    "--output-dir [value]": "Set absolute path for output directory",
    "--environment-name [value]": "Required: Set environment name to create",
    "--webhook-url [value]": "Set webhook url to use",
    "--webhook-secret [value]": "Set secret to invoke webhook",
    "--icon [value]": "Set absolute path for custom icon",

    "--username [value]": "Required: Set your Mulesoft username",
    "--password [value]": "Required: Set your Mulesoft password",
    "--master-organization-id [value]": "Required: Set your Mulesoft Master Organizatoin Id",
    "--include-mock-endpoints [value]": "Bool to include mock endpoints",
    "--generate-consumer-instances [value]": "Bool to generate consumer instances",
  },
};
