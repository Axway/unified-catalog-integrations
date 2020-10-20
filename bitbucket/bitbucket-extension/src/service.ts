import SwaggerParser from "@apidevtools/swagger-parser";
//@ts-ignore
import { loadConfig } from "@axway/amplify-cli-utils";
import { Bitbucket, Schema as BitbucketSchema } from "bitbucket";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
import yaml from "js-yaml";
import { URL } from "url";
import { Config, ConfigKeys } from "../types";
import { commitToFs, getIconData } from "./utils";

export class BitbucketService {
  private readonly client;

  constructor(private config: Config) {
    // validate if all the required configuration options have been set
    if ([ConfigKeys.BRANCH, ConfigKeys.ENVIRONMENT_NAME, ConfigKeys.REPO, ConfigKeys.WORKSPACE, ConfigKeys.APP_PASSWORD, ConfigKeys.USERNAME].some((key) => !config[key])) {
      throw new Error(`Missing required config. Run 'amplify central bitbucket-extension config set -h' to see a list of params`);
    }

    // read amplify-cli config values for network settings
    const amplifyConfig = loadConfig().values;

    let agent;
    if (amplifyConfig?.network) {
      // using strict ssl mode by default
      const sslConfig = { rejectUnauthorized: amplifyConfig.network.strictSSL === undefined || amplifyConfig.network.strictSSL };
      const proxyUrl = amplifyConfig.network.httpProxy || amplifyConfig.network.httpsProxy || amplifyConfig.network.proxy;
      // using HttpsProxyAgent if proxy url configured, else - regular node agent.
      if (proxyUrl) {
        let parsedProxyUrl;
        try {
          parsedProxyUrl = new URL(proxyUrl);
        } catch {
          throw new Error(`Could not parse provided network proxy url: ${proxyUrl}`);
        }
        agent = new HttpsProxyAgent({
          host: parsedProxyUrl.hostname,
          port: parsedProxyUrl.port,
          protocol: parsedProxyUrl.protocol,
          auth: `${parsedProxyUrl.username}:${parsedProxyUrl.password}`,
          ...sslConfig,
        });

        console.log(
          `Connecting using proxy settings protocol:${parsedProxyUrl.protocol}, host:${parsedProxyUrl.hostname}, port: ${parsedProxyUrl.port}, username: ${parsedProxyUrl.username}, rejectUnauthorized: ${sslConfig.rejectUnauthorized}`
        );
      } else {
        console.log(`Connecting using rejectUnauthorized: ${sslConfig.rejectUnauthorized}`);
        agent = new https.Agent(sslConfig);
      }
    }

    this.client = new Bitbucket({ auth: { username: config[ConfigKeys.USERNAME], password: config[ConfigKeys.APP_PASSWORD] }, request: { agent } });
  }

  public async generateResources() {
    let nextPageHash = "";

    while (true) {
      // get a page of contents
      const data = await this.getPage(nextPageHash || undefined);

      // see if the page contains a file that could be a specification yaml / json
      const entry = data.values?.find((e) => e.type === "commit_file" && this.isOASExtension(e.path || ""));

      if (entry?.path) {
        console.log(`Verifying specification at ${entry.path}`);
        // verify if we found a specification at this path
        await this.writeSpecification(entry.path);
        break;
      } else if (!data.next) {
        // if we did not find a specification file and there is no more next page, throw an error
        throw new Error("Could not find a specification file");
      } else {
        // there may be more pages to check, extract the page hash from the next link
        nextPageHash = data.next.substring(data.next.lastIndexOf("page="), data.next.length).replace("page=", "");
      }
    }
  }

  /**
   * Reads the Bitbucket source tree for a maximum of 20 depth of directory and sub-directories for a specified pageHash
   * @note pageHash = undefined fetches the first page
   * @param pageHash hash of the page to fetch
   */
  private async getPage(pageHash?: string): Promise<BitbucketSchema.PaginatedTreeentries> {
    const { branch, repo, workspace } = this.config;

    const { data } = await this.client.source.read({ max_depth: 20, node: branch, path: "", repo_slug: repo, workspace: workspace, page: pageHash });
    return data;
  }

  /**
   * Reads a file from Bitbucket, validates if it's a swagger/openapi specification and writes resource representations
   * @param path Bitbucket source path for a specification file
   */
  private async writeSpecification(path: string) {
    const { branch, repo, workspace } = this.config;
    console.log(`Reading file: ${path}`);
    const result = await this.client.source.read({ node: branch, path: path, repo_slug: repo, workspace });

    if (this.peek(path, result.data as string)) {
      const api = await SwaggerParser.validate(JSON.parse(result.data as string));
      await this.writeAPI4Central(repo, api);
    }
  }

  /**
   * Validates if a file name ends in yaml/json and is not a well-known non-specification file
   * @param filename name of a file
   */
  private isOASExtension(filename: string) {
    if (["package-lock.json", "package.json", ".travis.yml", "fixup.yaml", "jpdiff.yaml"].includes(filename)) {
      return false;
    }
    const pattern = /\.(yaml|yml|json)$/i;
    return pattern.test(filename);
  }

  /**
   * Parses a file and peeks in to check if it is a swagger / openapi specification
   * @param name file name
   * @param contents contents of the file
   */
  private peek(name: string, contents: string) {
    let isOAS = false;
    if (/\.(yaml|yml)$/i.test(name)) {
      // see if root of YAML is swagger for v2.0 or openapi for v3.0s
      const obj: any = yaml.safeLoad(contents);
      if (obj.swagger || obj?.openapi) {
        isOAS = true;
      }
    } else if (/\.(json)$/i.test(name)) {
      // see if root of JSON is XXX
      const obj = JSON.parse(contents);
      if (obj.swagger || obj.openapi) {
        isOAS = true;
      }
    }
    return isOAS;
  }

  private async writeAPI4Central(repo: string, api: any) {
    const resources = [];
    const attributes = { repo };
    const iconData = getIconData(this.config.icon);
    const apiName = api.info.title + "-" + api.info.version;
    const apiServiceName = `${apiName}`.toLowerCase().replace(/\W+/g, "-");

    // APIService
    const apiService = {
      apiVersion: "v1alpha1",
      kind: "APIService",
      name: apiServiceName,
      title: api.info.title,
      attributes: attributes,
      metadata: {
        scope: {
          kind: "Environment",
          name: this.config.environmentName,
        },
      },
      spec: {
        description: api.info.description,
        icon: iconData,
      },
    };

    resources.push(apiService);

    // APIServiceRevision
    const apiServiceRevisionName = apiServiceName; //`${api.info.title}-${api.info.version}`;
    let type = "oas3";
    if (api.swagger) {
      type = "oas2";
    }
    const apiServiceRevision = {
      apiVersion: "v1alpha1",
      kind: "APIServiceRevision",
      name: apiServiceName,
      attributes: attributes,
      metadata: {
        scope: {
          kind: "Environment",
          name: this.config.environmentName,
        },
      },
      spec: {
        apiService: apiServiceName,
        definition: {
          type: type,
          value: Buffer.from(JSON.stringify(api)).toString("base64"),
        },
      },
    };

    resources.push(apiServiceRevision);

    const endpoints = [];

    if (type === "oas2") {
      endpoints.push({
        host: api.host,
        protocol: (api.schemes || []).includes("https") ? "https" : "http",
        port: (api.schemes || []).includes("https") ? 443 : 80,
        ...(api.basePath ? { routing: { basePath: api.basePath } } : {}),
      });
    } else {
      for (const server of api.servers) {
        const parsedUrl = new URL(server.url);
        endpoints.push({
          host: parsedUrl.hostname,
          protocol: parsedUrl.protocol.substring(0, parsedUrl.protocol.indexOf(":")),
          port: parseInt(parsedUrl.port, 10),
          routing: { basePath: parsedUrl.pathname },
        });
      }
    }

    // APIServiceInstance
    const apiServiceInstance = {
      apiVersion: "v1alpha1",
      kind: "APIServiceInstance",
      name: apiServiceName,
      attributes: attributes,
      metadata: {
        scope: {
          kind: "Environment",
          name: this.config.environmentName,
        },
      },
      spec: {
        apiServiceRevision: apiServiceRevisionName,
        endpoint: endpoints,
      },
    };

    resources.push(apiServiceInstance);

    // ConsumerInstance
    const consumerInstance = {
      apiVersion: "v1alpha1",
      kind: "ConsumerInstance",
      name: apiServiceName,
      attributes: attributes,
      metadata: {
        scope: {
          kind: "Environment",
          name: this.config.environmentName,
        },
      },
      spec: {
        state: "PUBLISHED",
        name: apiServiceName,
        apiServiceInstance: apiServiceName,
        subscription: {
          enabled: false,
          autoSubscribe: false,
        },
      },
    };

    resources.push(consumerInstance);
    await commitToFs(consumerInstance, this.config.outputDir, resources);
  }
}
