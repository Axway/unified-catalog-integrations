export enum ConfigKeys {
  OUTPUT_DIR = "outputDir",
  ENVIRONMENT_NAME = "environmentName",
  WEBHOOK_URL = "webhookUrl",
  WEBHOOK_SECRET = "webhookSecret",
  ICON = "icon",

  USERNAME = "username",
  PASSWORD = "password",
  MASTER_ORGANIZATION_ID = "masterOrganizationId",
  INCLUDE_MOCK_ENDPOINTS = "includeMockEndpoints",
  GENERATE_CONSUMER_INSTANCES = "generateConsumerInstances"
}

export type Config = {
  [k in ConfigKeys]: string;
};
