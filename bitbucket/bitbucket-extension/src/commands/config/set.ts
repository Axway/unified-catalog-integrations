//@ts-ignore
import { snooplogg } from "cli-kit";
import { outputJsonSync, readJsonSync } from "fs-extra";
import { Config, ConfigKeys } from "../../../types";
import { configFilePath } from "../../utils";

type args = {
  argv: Partial<Config>;
  console: Console;
};

const { log } = snooplogg("bitbucket-extension: config: set");

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
  desc: "Set AMPLIFY Central bitbucket-extension configuration",
  aliases: ["set"],
  options: {
    "--output-dir [value]": "Set absolute path for output directory",
    "--environment-name [value]": "Required: Set environment name to create",
    "--icon [value]": "Set absolute path for custom icon",
    "--app-password [value]": "Required: Bitbucket app password",
    "--repo [value]": "Required: repository to search in",
    "--branch [value]": "Required: repository branch to search in",
    "--workspace [value]": "Required: repository workspace",
    "--username [value]": "Required: Bitbucket username",

    "--path [value]": "Path in repo to search for specs. Use a spec's absolute path to import one. Defaults to root",
    "--host [value]": "Bitbucket host, defaults to // TODO",
    "--api-version [value]": "Bitbucket version, defaults to v1",
    "--access-token [value]": "Bitbucket personal access token" 
  },
};
