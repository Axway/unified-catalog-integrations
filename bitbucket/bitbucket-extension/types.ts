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

export type ProxySettings = {
  strictSSL?: boolean;
  proxy?: string
}

export type v1ReadOpts = {
  start: number,
  limit: number,
  path: string,
  workspace: string,
  repo_slug: string,
  branch: string,
  baseUrl: string
}

export type v1BitbucketConfig = {
  auth: {
    username?: string,
    password?: string,
    token?: string
  },
  network: {
    strictSSL?: boolean;
    httpProxy?: string
  }
}

export type getPageConfig = {
  pageHash?: string,
  start?: number,
  limit?: number
}

export type pageValue = {
  type?: string,
  path?: string
}