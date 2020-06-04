const request = require("request");
const fs = require("fs");
const yaml = require("js-yaml");
const urlParser = require("url");
const SwaggerParser = require("@apidevtools/swagger-parser");
const { requestPromise } = require("./utils");

module.exports = class SwaggerHubService {
  constructor(config, log) {
    this.config = config || {};
    this.log = log;
    const { owner, rootUrl } = this.config;

    // Request settings for fetching apis
    this.requestSettings = {
      getAPIs: {
        method: "GET",
        url: `${rootUrl}${owner}`,
      },
    };
  }

  // login and fetch the apis from swaggerhub
  async fetch() {
    const apis = JSON.parse(await this._listAPIs());
    return this._buildAssetParams(apis);
  }

  // list swaggerhub apis
  _listAPIs() {
    return requestPromise({
      ...this.requestSettings.getAPIs,
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
    return NA;
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
  async _buildAssetParams(hubAPIs) {
    const assetParams = [];
    debugger;
    for (let hubAPI of hubAPIs.apis) {
      debugger;
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

      assetParams.push({
        apiServiceName,
        apiServiceRevisionName,
        displayName: api.info.title,
        environmentName: this.config.environmentName,
        apiDescription: apiProperties.description || "",
        swaggerEncoded,
        basePath: api.basePath,
        version: props.get("X-Version"),
        apiType,
        endpoint,
        title,
        ...(this.config.icon ? { icon: this.config.icon } : {}),
      });
    }
    return assetParams;
  }
};
