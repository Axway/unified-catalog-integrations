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
  pageNumber?: number,
  pageSize?: number,
  path?: string,
  opts?: object
}

export type getPageConfig = {
  pageNumber?: number,
  pageSize?: number
}

export type pageValue = {
  type?: string,
  path?: string
}