export enum ConfigKeys {
  ORGANIZATION_ID = "organizationId",
  USERNAME = "username",
  PASSWORD = "password",
  OUTPUT_DIR = "outputDir",
  ENVIRONMENT_NAME = "environmentName",
  ICON = "icon"
}

export type Config = {
  [k in ConfigKeys]: string;
};
