const fs = require("fs");
const yaml = require("js-yaml");
const urlParser = require("url");
const SwaggerParser = require("@apidevtools/swagger-parser");
import { requestPromise, commitToFs, getIconData } from "./utils";
import { loadConfig } from '@axway/amplify-config';

module.exports = class SwaggerHubService {
  constructor(config) {
    this.config = config || {};
    this.proxySettings = {};

    // Assert required params
		let missingParam = [
      'owner',
			'environmentName'
		].reduce((acc, cur) => {
			if (!this.config[cur]) {
				acc.push(cur);
				return acc;
			}
			return acc;
		}, []);

		if (missingParam.length) {
			console.log(`Missing required config: [${missingParam.join(', ')}]. Run 'axway central swaggerhub-extension config set -h' to see a list of params`);
			return process.exit(1);
    }

    if (!this.config.rootUrl) {
			this.config.rootUrl = 'https://api.swaggerhub.com/apis/'
		}

    const networkSettings = loadConfig().get('network') || {};
		const strictSSL = networkSettings.strictSSL;
		const proxy = networkSettings.httpProxy;

		if (strictSSL === false) {
			this.proxySettings.strictSSL = false;
		}

		if (proxy) {
			try {
				const parsedProxy = new URL(proxy);
				this.proxySettings.proxy = proxy;
				console.log(`Connecting using proxy settings protocol:${parsedProxy.protocol}, host:${parsedProxy.hostname}, port: ${parsedProxy.port}, username: ${parsedProxy.username}, rejectUnauthorized: ${!this.proxySettings.strictSSL}`);
			} catch (e) {
				console.log(`Could not parse proxy url ${proxy}`);
				return process.exit(1);
			}
		}
    
    // Request settings for fetching apis
    this.requestSettings = {
      getAPIs: {
        method: "GET",
        url: `${this.config.rootUrl}${this.config.owner}`
      },
    };
  }

  // login and fetch the apis from swaggerhub
  async generateResources() {
    const apis = JSON.parse(await this._listAPIs());
    return this._build(apis);
  }

  // list swaggerhub apis
  _listAPIs() {
    console.log('Listing Swaggerhub APIs');
    return requestPromise({
      ...this.requestSettings.getAPIs,
      ...this.proxySettings
    });
  }

  getProps(api) {
    var map = new Map();
    var props = api.properties;
    props.forEach((prop) => {
      var value = this.getValue(prop);
      map.set(this.getName(prop), this.getValue(prop));
    });
    return map;
  }

  getName(prop) {
    return prop.type;
  }

  getValue(prop) {
    if (prop.url) return prop.url;
    else if (prop.value) return prop.value;
    return;
  }

  getEndpoint(api, props) {
    if (props.get("X-OASVersion") === "2.0") {
      let endpoint = {
        host: api.host,
        protocol: api.schemes ? api.schemes[0] : "http",
        routing: { basePath: api.basePath },
      };
    } else {
      let parsedUrl = urlParser.parse(api.servers[0].url);

      let endpoint = {
        host: parsedUrl.hostname,
        protocol: parsedUrl.protocol.substring(
          0,
          parsedUrl.protocol.indexOf(":")
        ),
      };

      if (parsedUrl.port) {
        endpoint.port = parseInt(parsedUrl.port, 10);
      }

      if (parsedUrl.pathname) {
        endpoint.routing = { basePath: parsedUrl.pathname };
      }
    }

    if (api.basePath) {
      endpoint.routing = { basePath: api.basePath };
    }
    return endpoint;
  }

  // take the api info and the config info and prep data for generating yaml files
  async _build(hubAPIs) {
    console.log('Building Resources');
    const assetParams = [];
    for (let hubAPI of hubAPIs.apis) {
      var props = this.getProps(hubAPI);
      var api = await SwaggerParser.validate(props.get("Swagger"));
      const swaggerEncoded = Buffer.from(JSON.stringify(api)).toString(
        "base64"
      );
      const apiServiceName = `${hubAPI.name}`
        .toLowerCase()
        .replace(/\W+/g, "-")
        .replace(/-$/, "");
      const version = props.get("X-Version")
        ? props.get("X-Version").toLowerCase().replace(/\W+/g, "-")
        : api.info.version;
      const apiServiceRevisionName = `${apiServiceName}-${version}`;
      const apiProperties = (api && api.properties) || {};
      const apiType = props.get("X-OASVersion") === "2.0" ? "oas2" : "oas3";
      const endpoint = this.getEndpoint(api, props);
      const title = props.get("X-Version");
      const iconData = getIconData(this.config.icon);
      const displayName = `${api.info.title}-${api.info.version}`;

      // Resources
      const apiService = {
        apiVersion: "v1alpha1",
        kind: "APIService",
        name: apiServiceName,
        title: displayName,
        metadata: {
          scope: {
            kind: "Environment",
            name: this.config.environmentName,
          },
        },
        spec: {
          description: api.info.description || '',
          icon: iconData,
        },
      };

      const apiServiceRevision = {
        apiVersion: "v1alpha1",
        kind: "APIServiceRevision",
        name: apiServiceRevisionName,
        title: title,
        metadata: {
          scope: {
            kind: "Environment",
            name: this.config.environmentName,
          },
        },
        spec: {
          apiService: apiServiceName,
          definition: {
            type: apiType,
            value: swaggerEncoded,
          },
        },
      };

      const apiServiceInstance = {
        apiVersion: "v1alpha1",
        kind: "APIServiceInstance",
        name: apiServiceName,
        title: displayName,
        metadata: {
          scope: {
            kind: "Environment",
            name: this.config.environmentName,
          },
        },
        spec: {
          apiServiceRevision: apiServiceRevisionName,
          endpoint: [endpoint],
        },
      };
  
      const consumerInstanceInstance = {
        apiVersion: "v1alpha1",
        kind: "ConsumerInstance",
        name: apiServiceName,
        title: displayName,
        metadata: {
          scope: {
            kind: "Environment",
            name: this.config.environmentName,
          },
        },
        spec: {
          apiServiceInstance: apiServiceName,
          state: "PUBLISHED",
          subscription: {
            enabled: true,
            autoSubscribe: false,
          },
          version: version,
          tags: [],
        },
      };
      commitToFs(apiService, this.config.outputDir, [
        apiService,
        apiServiceRevision,
        apiServiceInstance,
        consumerInstanceInstance
      ]);
    }
  }
};
