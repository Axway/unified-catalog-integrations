export enum ConfigKeys {
  APP_PASSWORD = "appPassword",
  BRANCH = "branch",
  ENVIRONMENT_NAME = "environmentName",
  ICON = "icon",
  OUTPUT_DIR = "outputDir",
  REPO = "repo",
  WORKSPACE = "workspace",
  USERNAME = "username",
}

export type Config = {
  [k in ConfigKeys]: string;
};
