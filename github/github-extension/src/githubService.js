const { Octokit } = require("@octokit/rest");
const got = require("got");
const SwaggerParser = require("@apidevtools/swagger-parser");
const yaml = require("js-yaml");
const fs = require("fs");
const Path = require("path");
const mime = require('mime-types');
import { commitToFs } from './utils';

 //blacklist files to be in config
let blackList = new Set([
  "package-lock.json",
  "package.json",
  ".travis.yml",
  "fixup.yaml",
  "jpdiff.yaml"
]);

async function trawlRepo(config) {
  const {
    gitToken,
    gitUserName,
    repo,
    branch,
    icon,
    environmentName,
    outputDir = './resources'
  } = config;

  if (!gitToken || !gitUserName || !repo || !branch || !environmentName) {
    console.log("Missing required config. Run 'amplify central github-extension config set -h' to see a list of required params");
		process.exit(1);
  }

  // Create a github access token from Developer settings with repo access
  const octokit = new Octokit({
    auth: gitToken,
  });

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
  processRepo(owner, repo, ref, path, path);

  async function processRepo(owner, repo, ref, path, sourceRoot) {
    await octokit.rateLimit.get();
    var files = await octokit.repos
      .getContents({
        owner: owner,
        repo: repo,
        path: path,
        ref: ref,
      })
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  
    for (var item of files.data) {
      if (item.type == "dir") {
        await processRepo(owner, repo, ref, item.path, sourceRoot);
      }
      if (item.type == "file") {
        if (isOASExtension(item.name)) {
          var contents = await getContents(item, owner, repo, ref);
          if (peek(item.name, contents)) {
            try {
              var api = await SwaggerParser.validate(item.download_url);
              await writeAPI4Central(repo, item, api, contents);
            } catch (err) {
            }
          }
        }
      }
    }

    function isBlackListed(filename) {
      return blackList.has(filename);
    }

    function isOASExtension(filename) {
      if (isBlackListed(filename)) return false;
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
        if (obj.swagger) {
          isOAS = true;
        } else if (obj.openapi) {
          isOAS = true;
        }
      } else if (isJSON(name)) {
        // see if root of JSON is XXX
        const obj = JSON.parse(contents);
        if (obj.swagger) {
          isOAS = true;
        } else if (obj.openapi) {
          isOAS = true;
        }
      }
      return isOAS;
    }
    
    async function getContents(item, owner, repo, ref) {
      const response = await got(item.download_url);
      return response.body;
    }
        
    // TODO: fix resources too, extentions asks
    async function writeAPI4Central(repo, item, api, contents) {
      const resources = [];    
      let attributes = {
        repo: repo,
        download_url: item.download_url,
        sha: item.sha,
        html_url: item.html_url,
      };
    
      // icon
      let iconData;
      let iconPath;
      let defaultIconPath = Path.resolve(__dirname, './assets/env_icon.png');
      if (fs.existsSync(icon)) {
        iconPath = icon;
      } else {
        iconPath = defaultIconPath;
      }
      iconData = {
        contentType: mime.lookup(iconPath),
        data: fs.readFileSync(iconPath, { encoding: 'base64' })
      }

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
            name: environmentName,
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
            name: environmentName,
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
            name: environmentName,
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
            name: environmentName,
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
      await commitToFs(consumerInstance, outputDir, resources)
    }
  }
}





module.exports = {
	generateResources: trawlRepo
}