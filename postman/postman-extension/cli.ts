// @ts-ignore
import CLI from "cli-kit";
import { banner } from "./banner";
import { name, version } from "./package.json";
import { commands } from "./src/commands";
import { ensureConfigFileExists } from "./src/utils";

ensureConfigFileExists();

export default new CLI({
  title: "AMPLIFY Central Extension for Postman",
  name,
  banner,
  version,
  help: true,
  commands,
});
