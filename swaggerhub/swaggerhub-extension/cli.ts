// @ts-ignore
import CLI from "cli-kit";
import { banner } from "./banner";
const { name, version } = require("../package.json");
import { commands } from "./src/commands";
import { ensureConfigFileExists } from "./src/utils";

ensureConfigFileExists();

export default new CLI({
  title: "AMPLIFY Central Extension for Swagger Hub API Management",
  name,
  banner,
  version,
  help: true,
  commands,
});
