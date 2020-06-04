export enum ConfigKeys {
  OUTPUT_DIR = "outputDir",
  ENVIRONMENT_NAME = "environmentName",
  ICON = "icon",

  GIT_TOKEN = "gitToken",
  GIT_USER_NAME = "gitUserName",
  REPO = "repo",
  BRANCH = "branch"
}

export type Config = {
  [k in ConfigKeys]: string;
};
