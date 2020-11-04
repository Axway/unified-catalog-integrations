export enum ConfigKeys {
  APP_PASSWORD = "appPassword",
  BRANCH = "branch",
  ENVIRONMENT_NAME = "environmentName",
  ICON = "icon",
  OUTPUT_DIR = "outputDir",
  REPO = "repo",
  WORKSPACE = "workspace",
  USERNAME = "username",
  PATH = "path",
  BASE_URL = "baseUrl",
  API_VERSION = "apiVersion",
  ACCESS_TOKEN = "accessToken"
}

export type Config = {
  [k in ConfigKeys]: string;
};
