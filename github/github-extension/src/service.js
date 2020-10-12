const { Octokit } = require("@octokit/rest");
const SwaggerParser = require("@apidevtools/swagger-parser");
const yaml = require("js-yaml");
import isEmpty from 'lodash/isEmpty';
import { commitToFs, getIconData } from './utils';
import { loadConfig } from '@axway/amplify-cli-utils';
import https from 'https';
import HttpsProxyAgent from 'https-proxy-agent';

module.exports = class GithubService {
    constructor(config) {
      this.config = config || {};
      let missingParam = [
        'gitToken',
        'gitUserName',
        'repo',
        'branch',
        'environmentName',
      ].reduce((acc, cur) => {
        if (!this.config[cur]) {
          acc.push(cur);
          return acc;
        }
        return acc;
      }, []);
  
      if (missingParam.length) {
        console.log(`Missing required config: [${missingParam.join(', ')}]. Run 'amplify central github-extension config set -h' to see a list of params`);
        process.exit(1);
      }

      const centralConfig = loadConfig().values;
    
      if (centralConfig.network && !isEmpty(centralConfig.network)) {
        // using strict ssl mode by default
        const sslConfig = { rejectUnauthorized: centralConfig.network.strictSSL === undefined || centralConfig.network.strictSSL };
        const proxyUrl = centralConfig.network.httpProxy || centralConfig.network.httpsProxy || centralConfig.network.proxy;
        // using HttpsProxyAgent if proxy url configured, else - regular node agent.
        let agent;
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

          console.log(`Connecting using proxy settings protocol:${parsedProxyUrl.protocol}, host:${parsedProxyUrl.hostname}, port: ${parsedProxyUrl.port}, username: ${parsedProxyUrl.username}, rejectUnauthorized: ${sslConfig.rejectUnauthorized}`);
        } else {
          console.log(`Connecting using rejectUnauthorized: ${sslConfig.rejectUnauthorized}`);
          agent = new https.Agent(sslConfig);
        }
        
        this.octokit = new Octokit({
          auth: this.config.gitToken,
          request: {agent}
        });
      } else {
        this.octokit = new Octokit({
          auth: this.config.gitToken,
        });
      }
    }

    async generateResources() {
      const {
        gitToken,
        gitUserName,
        repo,
        branch,
        icon,
        environmentName,
        outputDir = './resources'
      } = this.config;
        
      const github = {
        owner: gitUserName,
        repo,
        branch,
      };
      let path = "";
      let owner = github.owner;
      let ref = github.commit
        ? github.commit
        : github.tag
        ? github.tag
        : github.branch
        ? github.branch
        : "master";
      console.log('Listing Github APIs');
      return this.processRepo(owner, github.repo, ref, path, path);
    }

    async processRepo(owner, repo, ref, path, sourceRoot) {
      await this.octokit.rateLimit.get();
      var files = await this.octokit.repos
        .getContent({
          owner: owner,
          repo: repo,
          path: path,
          ref: ref,
        })
        .catch((e) => {
          console.error(e);
          process.exit(1);
        });
      if (path) console.log(`Checking for resources on path: ${path}`);
      for (var item of (files || { data: [] }).data) {
        if (item.type === "dir") {
          await this.processRepo(owner, repo, ref, item.path, sourceRoot);
        }
        if (item.type === "file") {
          if (isOASExtension(item.name)) {
            try {
              var contents = await this.getContents(owner, repo, item, ref);
              if (peek(item.name, contents)) {
                var api = await SwaggerParser.validate(item.download_url);
                await this.writeAPI4Central(repo, item, api);
              }
            } catch (err) {
              console.error(`Could not build resources for path ${item.path}. Error: ${err}`);
            }
          }
        }
      }
      
      function isOASExtension(filename) {
        if ([
          "package-lock.json",
          "package.json",
          ".travis.yml",
          "fixup.yaml",
          "jpdiff.yaml"
        ].includes(filename)) {
          return false
        }
        var pattern = /\.(yaml|yml|json)$/i;
        return pattern.test(filename);
      }
  
      function isYaml(filename) {
        var patten = /\.(yaml|yml)$/i;
        return patten.test(filename);
      }
  
      function isJSON(filename) {
        var patten = /\.(json)$/i;
        return patten.test(filename);
      }
  
      function peek(name, contents) {
        let isOAS = false;
        if (isYaml(name)) {
          // see if root of YAML is swagger for v2.0 or openapi for v3.0
          const obj = yaml.safeLoad(contents);
          if (obj.swagger || obj.openapi) {
            isOAS = true;
          }
        } else if (isJSON(name)) {
          // see if root of JSON is XXX
          const obj = JSON.parse(contents);
          if (obj.swagger || obj.openapi) {
            isOAS = true;
          }
        }
        return isOAS;
      }
      
      
    }
    async getContents(owner, repo, item, ref) {
      console.log(`Downloading spec from ${item.path}`);
      const result = await this.octokit.repos.getContent({ "owner": owner, "repo": repo, "path": item.path, "ref": ref })
      return Buffer.from(result.data.content, 'base64').toString('utf8')
    }

    async writeAPI4Central(repo, item, api) {
      const resources = [];    
      let attributes = {
        repo: repo,
        download_url: item.download_url,
        sha: item.sha,
        html_url: item.html_url,
      };
      let iconData = getIconData(this.config.icon);    
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
          icon: iconData
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

      let endpoints = [];

      if (type === "oas2") {
          endpoints =  [{
            host: api.host,
            protocol: (api.schemes || []).includes('https') ? 'https': 'http',
            port: (api.schemes || []).includes('https') ? 443: 80,
            ...(api.basePath ? { routing: { basePath: api.basePath } } : {})
          }]
      }
      else {
        for (const server of api.servers) {
          let parsedUrl = new URL(server.url);
          let endpoint = {
            host: parsedUrl.hostname,
            protocol: parsedUrl.protocol.substring(0, parsedUrl.protocol.indexOf(':'))
          };
  
          if (parsedUrl.port) {
            endpoint.port = parseInt(parsedUrl.port, 10);
          }
          endpoint.routing = { basePath: parsedUrl.pathname };
          endpoints.push(endpoint);
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
          endpoint: endpoints
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
      await commitToFs(consumerInstance, this.config.outputDir, resources)
    }
}

