import SwaggerParser from "@apidevtools/swagger-parser";
//@ts-ignore
import { loadConfig } from "@axway/amplify-cli-utils";
import { Bitbucket } from "bitbucket";
import { APIClient } from "bitbucket/src/plugins/register-endpoints/types";
import https from "https";
import HttpsProxyAgent from "https-proxy-agent";
import yaml from "js-yaml";
import * as uri from "url";
import * as p from "path";
import { Config, ConfigKeys, ProxySettings, v1ReadOpts, v1BitbucketConfig, getPageConfig, pageValue } from "../types";
import { commitToFs, getIconData, requestPromise, isOASExtension } from "./utils";


class BitBucketV1 {
  private auth;
  private proxySettings: ProxySettings = {}

  constructor (config: v1BitbucketConfig) {
    this.auth = config.auth;
    const { strictSSL, httpProxy: proxy } = config.network || {};

    if (strictSSL === false) {
			this.proxySettings.strictSSL = false;
		}

		if (proxy) {
			try {
				const parsedProxy = new uri.URL(proxy);
				this.proxySettings.proxy = proxy;
				console.log(`Connecting using proxy settings protocol:${parsedProxy.protocol}, host:${parsedProxy.hostname}, port: ${parsedProxy.port}, username: ${parsedProxy.username}, rejectUnauthorized: ${this.proxySettings.strictSSL}`);
			} catch (e) {
				console.log(`Could not parse proxy url ${proxy}`);
				return process.exit(1);
			}
		}
  }

  get source() {
    let self = this;
    return {
      read:  async (options: v1ReadOpts) => {
        // URL for listing files <baseUrl>/projects/<project>/repos/<repo>/files/<path>?start=0&limit=25&at=<branch>
        // URL for getting content <baseUrl>/projects/<project>/repos/<repo>/raw/<path>?start=0&limit=25&at=<branch>
        const { start = 0, limit = 25, path = '/', branch, repo_slug: repo, workspace: project, baseUrl } = options;
        const qs = `?start=${start}&limit=${limit}&at=${branch}`;
        const dirOrFile = `${isOASExtension(path) ? '/raw/' : '/files/'}${ path.startsWith('/') ? path.substr(1) : path }`
        const url = uri.resolve(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`, `projects/${project}/repos/${repo}${dirOrFile}${qs}`)

        return { data: await requestPromise({
          method: 'GET',
          json: true,
          url,
          auth: {
            ...(self.auth.username ? { username: self.auth.username, password: self.auth.password } : { bearer: self.auth.token })
          },
          ...self.proxySettings
        })}
      }
    }
  }
}

module.exports = class BitbucketService {
  private readonly client : BitBucketV1 | APIClient | undefined

  constructor(private config: Config) {
    // validate if all the required configuration options have been set

    let missingParam = [
      ConfigKeys.BRANCH,
      ConfigKeys.ENVIRONMENT_NAME,
      ConfigKeys.REPO,
      ConfigKeys.WORKSPACE
    ].reduce((acc: Array<string>, cur: string) => {
      if (!(config as any)[cur]) {
        acc.push(cur);
        return acc;
      }
      return acc;
    }, []);

    // Check user/password/token
    if (!config.username && !config.appPassword && !config.accessToken) {
      missingParam.push('appPassword + username or accessToken')
    } else if (config.username && !config.appPassword) {
      missingParam.push('appPassword');
    } else if (!config.username && config.appPassword) {
      missingParam.push('username')
    }

    // v1 isn't in bitbucket cloud anymore
    if (config.apiVersion === 'v1' && !config.baseUrl) {
      missingParam.push('apiVersion v1 requires setting a baseUrl. example: http://127.0.0.1:7990/rest/api/1.0')
    }

    if (missingParam.length) {
      console.log(`Missing required config: [${missingParam.join(', ')}]. Run 'amplify central bitbucket-extension config set -h' to see a list of params`);
      return process.exit(1);
    }

    this.config.apiVersion = this.config.apiVersion || 'v2'

    // read amplify-cli config values for network settings
    const amplifyConfig = loadConfig().values;

    // Configure a proxy if it is configured
    let agent;
    if (amplifyConfig?.network && this.config.apiVersion !== 'v1') {
      const sslConfig = { rejectUnauthorized: amplifyConfig.network.strictSSL === undefined || amplifyConfig.network.strictSSL };
      const proxyUrl = amplifyConfig.network.httpProxy || amplifyConfig.network.httpsProxy || amplifyConfig.network.proxy;
      if (proxyUrl) {
        let parsedProxyUrl;
        try {
          parsedProxyUrl = new uri.URL(proxyUrl);
        } catch {
          // TODO: Sometimes we throw, sometimes we exit
          throw new Error(`Could not parse provided network proxy url: ${proxyUrl}`);
        }
        agent = new HttpsProxyAgent({
          host: parsedProxyUrl.hostname,
          port: parsedProxyUrl.port,
          protocol: parsedProxyUrl.protocol,
          auth: `${parsedProxyUrl.username}:${parsedProxyUrl.password}`,
          ...sslConfig
        });

        console.log(
          `Connecting using proxy settings protocol:${parsedProxyUrl.protocol}, host:${parsedProxyUrl.hostname}, port: ${parsedProxyUrl.port}, username: ${parsedProxyUrl.username}, rejectUnauthorized: ${sslConfig.rejectUnauthorized}`
        );
      } else {
        console.log(`Connecting using rejectUnauthorized: ${sslConfig.rejectUnauthorized}`);
        agent = new https.Agent(sslConfig);
      }
    }

    if (this.config.apiVersion === 'v1') {
      this.client = new BitBucketV1({
        auth: { username: config[ConfigKeys.USERNAME], password: config[ConfigKeys.APP_PASSWORD], token: config[ConfigKeys.ACCESS_TOKEN] },
        network: amplifyConfig?.network
      });
    } else {
      this.client = new Bitbucket({
        auth: { ...(config[ConfigKeys.USERNAME] ? { username: config[ConfigKeys.USERNAME], password: config[ConfigKeys.APP_PASSWORD] } : { token: config[ConfigKeys.ACCESS_TOKEN] })},
        request: { agent },
        ...(this.config.baseUrl ? { baseUrl : this.config.baseUrl } : {})
      });
    }
  }

  /**
   * Creates resource files from the provided repo/path for the given branch/project/workspace
   * Gets a page and writes the resource for each oas spec found
   * v1:  while isLastPage !== true
   * v2:  while data.next
   */
  public async generateResources() {
    let nextPageHash = '';
    let start = 0;
    let limit = 25;
    let canPage = true; 
    while (canPage === true) {

      // Write spec if the path was an absolute path
      if (isOASExtension(this.config.path)) {
        return this.writeSpecification(this.config.path)
      }

      const page = await this.getPage({
        pageHash: nextPageHash,
        start,
        limit
      }) || {};

      // Build a list of all the paths for the files eg: [ 'spec.json', 'dir/spec2.json' ]
      // v2 has metadata and v1 doesn't
      const specPaths = (page.values || []).reduce((acc: Array<string>, item: pageValue | string) => {
        if (typeof item === 'object' && item.type === "commit_file" && isOASExtension(item.path || "")) {
          return acc.concat(item.path as string)
        }
        if (isOASExtension(item as string)) {
          return acc.concat(p.join(this.config.path, item as string));
        }
        return acc;
      }, []);

      specPaths.length && await Promise.all(specPaths.map((p: string) => this.writeSpecification(p)))

      // Setup for next loop or to exit. v1 uses page.next, v2 uses pageHash
      start = page.nextPageStart;
      page.next = page.next || '';
      nextPageHash = (page.next).substring(page.next.lastIndexOf("page="), page.next.length).replace("page=", "");
      canPage = this.config.apiVersion === 'v1' ? (page.isLastPage !== undefined ? !page.isLastPage : false) : !!page.next
    }
  }

  /**
   * Reads the Bitbucket source tree for specified pageHash or start/limit
   * @note pageHash = undefined fetches the first page
   * @param pageOptions object containing start/limit (v1) or pageHash (v2)
   */
  private async getPage(pageOptions: getPageConfig) {
    const { pageHash: page, start, limit } = pageOptions;
    const { branch, repo, workspace, apiVersion, path, baseUrl } = this.config;

    let clientOptions: any;
    if (apiVersion === 'v1') {
      clientOptions = { start, limit, path, branch, repo_slug: repo, workspace, baseUrl }
    } else {
      clientOptions = { max_depth: 20, node: branch, path, repo_slug: repo, workspace, ...(!!page ? { page } : {}) }
    }
    try {
      // Client can be undefined if the service constructor threw
      const { data } = await this.client?.source?.read(clientOptions);
      return data;
     } catch (e) {
       throw (e);
     }
  }

  /**
   * Reads a file from Bitbucket, validates if it's a swagger/openapi specification and writes resource representations
   * @param path Bitbucket source path for a specification file
   */
  private async writeSpecification(path: string) {
    const { branch, repo, workspace, baseUrl, apiVersion } = this.config;
    console.log(`Reading file: ${path}`);
    let clientOptions: any;
    if (apiVersion === 'v1') {
      clientOptions = { path, branch, repo_slug: repo, workspace, baseUrl }
    } else {
      clientOptions = { node: branch, path: path, repo_slug: repo, workspace }
    }
    const result = await this.client?.source?.read(clientOptions);
    // TODO: does this account for yaml?
    const content = typeof result.data === 'object' ? JSON.stringify(result.data) : result.data;
    if (content && this.peek(path, content)) {
      const api = await SwaggerParser.validate(JSON.parse(content as string));
      await this.writeAPI4Central(repo, api);
    }
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
        const parsedUrl = new uri.URL(server.url);
        endpoints.push({
          host: parsedUrl.hostname,
          protocol: parsedUrl.protocol.substring(0, parsedUrl.protocol.indexOf(":")),
          routing: { basePath: parsedUrl.pathname },
          ...(parsedUrl.port ? { port: parseInt(parsedUrl.port, 10) } : {})
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
