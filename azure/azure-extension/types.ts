export enum ConfigKeys {
  CLIENT_ID = "clientId",
  CLIENT_SECRET = "clientSecret",
  TENANT_ID = "tenantId",
  SUBSCRIPTION_ID = "subscriptionId",
  RESOURCE_GROUP_NAME = "resourceGroupName",
  SERVICE_NAME = "serviceName",
  FILTER = "filter",
  OUTPUT_DIR = "outputDir",
  ENVIRONMENT_NAME = "environmentName",
  WEBHOOK_URL = "webhookUrl",
  ICON = "icon"
}

export type Config = {
  [k in ConfigKeys]: string;
};
