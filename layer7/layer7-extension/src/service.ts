
import SwaggerParser from "@apidevtools/swagger-parser";
//@ts-ignore
import { loadConfig } from "@axway/amplify-cli-utils";
import { request } from "http";
import yaml from "js-yaml";
import * as uri from "url";
// import * as p from "path";
import { Config, ConfigKeys, ProxySettings, getPageConfig, /* pageValue, */ ReadOpts } from "../types";
import { commitToFs, getIconData, isOASExtension, requestPromise/* , isOASExtension */ } from "./utils";

// TODO: fix tsconfig
module.exports = class Layer7Service {
  private proxySettings: ProxySettings = { strictSSL: true, proxy: undefined }
  private accessToken: string = ''
  private url: uri.URL = new uri.URL(this.config.baseUrl)
  constructor(private config: Config) {

    // validate if all the required configuration options have been set
    let missingParam = [
      ConfigKeys.ENVIRONMENT_NAME,
      ConfigKeys.CLIENT_ID,
      ConfigKeys.CLIENT_SECRET,
      ConfigKeys.BASE_URL
    ].reduce((acc: Array<string>, cur: string) => {
      if (!(config as any)[cur]) {
        acc.push(cur);
        return acc;
      }
      return acc;
    }, []);

    if (missingParam.length) {
      console.log(`Missing required config: [${missingParam.join(', ')}]. Run 'amplify central layer7-extension config set -h' to see a list of params`);
      return process.exit(1);
    }

    // read amplify-cli config values for network settings
    const amplifyConfig = loadConfig().values;

    // Configure a proxy if it is configured
    const { strictSSL, httpProxy: proxy } = amplifyConfig.network || {};

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

  private async login() {
    const { clientId, clientSecret } = this.config;
    let login;

    try {
      login = await requestPromise({
        method: 'POST',
        url: `${this.url.origin}/auth/oauth/v2/token`,
        body: `client_id=${clientId}&grant_type=client_credentials&scope=OOB&client_secret=${clientSecret}`,
        json: true,
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        ...this.proxySettings
      }) as any || { access_token: undefined }
    } catch (error) {
      throw error
    }
    this.accessToken = login.access_token
  }

  public async generateResources() {
    let canPage = true; 
    let pageSize = 100;
    let pageNumber = 1;

    console.log('Logging in...');
    await this.login();
    console.log('Generating resources files...');

    while (canPage === true) {
      const page = await this.getPage({
        pageNumber,
        pageSize
      }) || { apis: [] };

      // Process our REST/WSDL APIs
      page.apis.length && await Promise.all(page.apis.map(async (entry: any) => {
        const { __definition: definition, ...meta } = entry;

        if (entry.apiServiceType === 'REST') {
          const api = await SwaggerParser.validate(definition);
          await this.writeAPI4Central(meta, api)
        } else if (entry.apiServiceType === 'SOAP') {
          // TODO: look at mulesoft for WSDL
          console.log('Process wsdl')
        }
      }));

      // Setup for next loop or to exit
      pageNumber++;
      canPage = page.canPage;
    }
  }

  private async read(readOpts: ReadOpts): Promise<any> {
    // fetchs apis
    const { pageSize = 100, pageNumber = 1, path = '/', opts = {} } = readOpts;
    const qs = `?pageSize=${pageSize}&pageNumber=${pageNumber}`;
    let url = `${this.url.href}${path.startsWith('/') ? path : '/' + path}${qs}`;

    return { data: await requestPromise({
      method: 'GET',
      json: true,
      url,
      auth: {
        bearer: this.accessToken
      },
      ...opts,
      ...this.proxySettings
    })}
  }

  /**
   * Reads the layer7 apis, returns { apis: object, canPage: bool }
   * @param pageOptions object containing page info
   */
  private async getPage(pageOptions: getPageConfig) {
    // TODO: Get paging working
    // https://techdocs.broadcom.com/us/en/ca-enterprise-software/layer7-api-management/api-portal-legacy/3-5/manage-the-api-portal/customize-the-api-portal/paginate-the-records.html
    
    const { pageNumber, pageSize } = pageOptions;

    try {
      // List all APIs
      const { data }  = await this.read({
        pageNumber,
        pageSize,
        path: '/api-management/1.0/apis'
      });

      let apis = (await Promise.all(data.results.map(async (item: any) => {
        
        if (item.ssgServiceType === 'REST') {
          // get apis, need data later
          let { data: api }  = await this.read({
            path: `/api-management/1.0/apis/${item.uuid}`
          })

          // get assets
          let { data: assets } = await this.read({
            path: `/api-management/1.0/apis/${item.uuid}/assets`
          }) || [];

          // TODO: Is this the best/only way to get spec? Only expect one?
          assets = assets.filter((asset: any) => asset.type === 'JSON' && isOASExtension(asset.name));
          if (assets.length > 1) {
            throw new Error('More than one spec file found')
          }

          // Fetch the spec file
          if (assets.length) {
            api.__fileName = assets[0].name;
            const { data: definition } =  await this.read({
              path: `/api-management/1.0/apis/${item.uuid}/assets/${assets[0].uuid}/file`,
              opts: { json: false }
            })
            api.__definition = definition
          }
          return api;
        } else if (item.ssgServiceType === 'SOAP') {
          // TODO: Flesh out fetch wsdl
          let { data: api }  = await this.read({
            path: `/api-management/1.0/apis/${item.uuid}/assets/wsdl`
          })
          return api
        }
      }))).filter((a: any) => {
        // Only work on apis with specs or WSDL
        if (a.apiServiceType === 'REST') {
          // Parse the yaml/json while we're at it
          const isOAS = this.peek(a.__fileName, a.__definition)
          if (!!isOAS && typeof isOAS === 'object') {
            a.__definition = isOAS
          } else if (!!isOAS) {
            a.__definition = JSON.parse(a.__definition);
          }
          return !!isOAS;
        } else if (a.apiServiceType === 'SOAP') {
          return true;
        }
        return false;
      })

      // return our apis and indicate if we can still page
      return { apis, canPage: !(data.currentPage + 1 === data.totalPages) };
     } catch (e) {
       throw (e);
     }
  }

  /**
   * Parses a file and peeks in to check if it is a swagger / openapi specification
   * If its a yaml then might as well return truthy with the spec
   * @param name file name
   * @param contents contents of the file
   */
  private peek(name: string, contents: string) {
    let isOAS = false;
    if (/\.(yaml|yml)$/i.test(name)) {
      // see if root of YAML is swagger for v2.0 or openapi for v3.0s
      const obj: any = yaml.safeLoad(contents);
      if (obj.swagger || obj?.openapi) {
        isOAS = obj;
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
  //  TODO: add/modify these resources
  //  Apiserviceinstnace host should derive from baseurl for now. They're may be multiple portals in the future
  //  Add a new config for webhook url
  //  Create: webhook, consumersubscriptiondefinition thats linked in consumerinstance
  private async writeAPI4Central(meta: any, api: any) {
    const resources = [];
    const iconData = getIconData(this.config.icon);

    const {
      uuid: apiId,
      name,
      portalStatus,
      description,
      privateDescription,
      version,
      ssgUrl,
      authenticationParameters
    } = meta;
    const attributes = { apiId };
    const apiServiceName = `${name}`.toLowerCase().replace(/\W+/g, "-");
    

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
        description: privateDescription,
        icon: iconData,
      },
    };

    resources.push(apiService);

    // APIServiceRevision
    const apiServiceRevisionName = `${apiServiceName}-${version}`;

    let type = "oas3";
    if (api.swagger) {
      type = "oas2";
    }
    const apiServiceRevision = {
      apiVersion: "v1alpha1",
      kind: "APIServiceRevision",
      name: apiServiceRevisionName,
      title: apiServiceRevisionName,
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
      const parsedUrl = new uri.URL(this.config.baseUrl);
      endpoints.push({
        host: parsedUrl.hostname,
        protocol: parsedUrl.protocol.replace(':',''),
        ...(parsedUrl.port ? { port: parseInt(parsedUrl.port, 10) } : {}),
        ...(ssgUrl ? { routing: { basePath: ssgUrl.startsWith('/') ? ssgUrl : `/${ssgUrl}` } } : {}),
      });
    } else {
      for (const _ of api.servers) {
        const parsedUrl = new uri.URL(this.config.baseUrl);
        endpoints.push({
          host: parsedUrl.hostname,
          protocol: parsedUrl.protocol.replace(':', ''),
          routing: { basePath: ssgUrl.startsWith('/') ? ssgUrl : `/${ssgUrl}` },
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
          enabled: portalStatus === 'ENABLED',
          autoSubscribe: false,
        },
        documentation: `${description} AuthenticationParameters: ${authenticationParameters}`
      },
    };

    resources.push(consumerInstance);
    await commitToFs(consumerInstance, this.config.outputDir, resources);
  }
}
