export enum ConfigKeys {
  ENVIRONMENT_NAME = "environmentName",
  ICON = "icon",
  OUTPUT_DIR = "outputDir",
  CLIENT_ID = "clientId",
  CLIENT_SECRET = "clientSecret",
  BASE_URL = "baseUrl",
  WEBHOOK_URL = "webhookUrl"
}

export type Config = {
  [k in ConfigKeys]: string;
};

export type ProxySettings = {
  strictSSL?: boolean;
  proxy?: string
}

export type ReadOpts = {
  page?: number,
  size?: number,
  path?: string,
  opts?: object
}

export type getPageConfig = {
  page?: number,
  size?: number
}

export type pageValue = {
  type?: string,
  path?: string
}