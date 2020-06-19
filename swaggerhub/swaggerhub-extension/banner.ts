// @ts-ignore
import { chalk } from "cli-kit";
const { description, name, version } = require("../package.json");

export const banner =
  chalk`{cyan ${name} v${version}}` +
  "\n" +
  chalk`{cyan ${description}}` +
  "\n" +
  chalk`{dim Copyright© 2020, Axway, Inc. All Rights Reserved.}` +
  "\n" +
  chalk`{dim Visit us at: '{underline https://apicentral.axway.com}'}`;
