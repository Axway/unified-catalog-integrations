const { Octokit } = require("@octokit/rest");
const got = require("got");
const SwaggerParser = require("@apidevtools/swagger-parser");
const yaml = require("js-yaml");
const fs = require("fs");
const Path = require("path");
const mime = require('mime-types');
import { commitToFs, getIconData } from './utils';

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
      this.octokit = new Octokit({
        auth: this.config.gitToken,
      });
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
        
      var github = {
        owner: gitUserName,
        repo,
        branch,
      };
      let repo = github.repo;
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
      return this.processRepo(owner, repo, ref, path, path);
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
      console.log('Building Resources');
      for (var item of (files || { data: [] }).data) {
        if (item.type == "dir") {
          await this.processRepo(owner, repo, ref, item.path, sourceRoot);
        }
        if (item.type == "file") {
          if (isOASExtension(item.name)) {
            var contents = await this.getContents(item);
            if (peek(item.name, contents)) {
              try {
                var api = await SwaggerParser.validate(item.download_url);
                await this.writeAPI4Central(repo, item, api);
              } catch (err) {
              }
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
        };
        var pattern = /\.(yaml|yml|json)$/i;
        var isOAS = pattern.test(filename);
        return isOAS;
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
        var isOAS = false;
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
    async getContents(item) {
      const response = await got(item.download_url);
      return response.body;
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
      var apiName = api.info.title + "-" + api.info.version;
      var apiServiceName = `${apiName}`.toLowerCase().replace(/\W+/g, "-");
      
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
      var type = "oas3";
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
          endpoint: [{
            host: api.host,
            protocol: (api.schemes || []).includes('https') ? 'https': 'http',
            port: (api.schemes || []).includes('https') ? 443: 80,
            ...(api.basePath ? { routing: { basePath: api.basePath } } : {})
          }],
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
