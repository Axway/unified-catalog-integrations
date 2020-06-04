export enum ConfigKeys {
  OWNER = "owner",
  ROOT_URL = "rootUrl",
  OUTPUT_DIR = "outputDir",
  ENVIRONMENT_NAME = "environmentName",
  ICON = "icon",
}

export type Config = {
  [k in ConfigKeys]: string;
};
