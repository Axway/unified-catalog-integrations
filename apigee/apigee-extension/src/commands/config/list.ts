//@ts-ignore
import { snooplogg } from "cli-kit";
import { readJsonSync } from "fs-extra";
import { configFilePath } from "../../utils";

type args = {
  argv: { [k: string]: string };
  console: Console;
};

const { log } = snooplogg("apigee-extension: config: list");

export const list = {
  action: ({ console }: args) => {
    log(`Listing config`);
    log(`Reading config file: ${configFilePath}`);

    console.log(readJsonSync(configFilePath));
  },
  desc: "View AMPLIFY Central apigee-extension configuration",
  aliases: ["ls", "view"],
};
