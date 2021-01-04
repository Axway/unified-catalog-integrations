export enum ConfigKeys {
  APIKEY = "apikey",
  WORKSPACE_ID = "workspaceId",
  TEAM = "team",
  ORGANIZATION_ID = "organizationId"
}

export type Config = {
  [k in ConfigKeys]: string;
};

export type ProxySettings = {
  strictSSL?: boolean;
  proxy?: string
}

export type ReadOpts = {
  method?: string,
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