
//@ts-ignore
import { chalk, snooplogg } from "cli-kit";
//@ts-ignore
import { loadConfig } from "@axway/amplify-cli-utils";
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
import * as uri from "url";
import { Config, ConfigKeys, ProxySettings, getPageConfig, ReadOpts } from "../types";
import { requestPromise } from "./utils";

module.exports = class PostmanService {
  private proxySettings: ProxySettings = { strictSSL: true, proxy: undefined }
  constructor(private config: Config) {
    // validate if all the required configuration options have been set
    let missingParam = [
      ConfigKeys.APIKEY,
      ConfigKeys.WORKSPACE_ID
    ].reduce((acc: Array<string>, cur: string) => {
      if (!(config as any)[cur]) {
        acc.push(cur);
        return acc;
      }
      return acc;
    }, []);

    if (missingParam.length) {
      console.log(`Missing required config: [${missingParam.join(', ')}]. Run 'amplify central postman-extension config set -h' to see a list of params`);
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


  public async postmanAPIRequest(readOpts: ReadOpts = {}): Promise<any> {
    const { path = '/', opts = {}, method = 'GET' } = readOpts;
    let url = `https://api.getpostman.com${path.startsWith('/') ? path : '/' + path}`;
    return requestPromise({
      method: method,
      json: true,
      url,
      headers: {
        'X-Api-Key': this.config.apikey
      },
      ...opts,
      ...this.proxySettings
    })
  }

  public async syncResources() {

    console.log(chalk["yellow"](`Checking if workspace exists with id: ${this.config.workspaceId}`));
    let workspace:any = await this.postmanAPIRequest({
      path: `/workspaces/${this.config.workspaceId}`
    });
    
    if (!workspace) {
      throw new Error(`Workspace with id ${this.config.workspaceId} not found.`)
    }

    console.log(chalk["yellow"](`Resources sync executing against workspace: ${workspace.workspace.name}`));
  
    //TODO get all existing APIs from the workspace
    https://api.getpostman.com/apis?workspace={{workspaceId}}

    //get platform token
    const centralToken = await this.getTokenFromAmplifyCli(this.config.organizationId);

    //get platform team id

    let teamId;

		if (this.config.team) {
			const teamDetails = await this.getPlatformTeamDetails(centralToken, this.config.team);
			if (teamDetails.success === false || teamDetails.result.length == 0) {
				throw new Error(
					`Team not found with name ${this.config.team} in organization ${this.config.organizationId}`
				);
			}
			teamId = teamDetails.result[0].guid;
    }

    //get all unified catalog apis
    let canPage = true; 
    let size = 20;
    let page = 1;

    while (canPage === true) {
      const catalogItems = await this.getCatalogItemsPage({
        page,
        size
      }, teamId, centralToken);

      for (let catalogItem of catalogItems) {
        console.log(chalk["yellow"](`Processing catalog item with name: ${catalogItem.name}`));
        //TODO check if postman API exists with that name, if so, skip creating it
        
        //create the postman API
        let createdAPI = await this.postmanAPIRequest({method: 'POST', path: `/apis?workspace=${this.config.workspaceId}`,opts:{
          json: {
            api: {
              name: catalogItem.name,
              summary: catalogItem.description,
              description: `Generated from [Catalog Item](https://apicentral.axway.com/catalog/explore/${catalogItem.id})\n\n ` 
              + await this.getCatalogItemRevisionDocumentation(centralToken, teamId, catalogItem.id, Math.max(...catalogItem.availableRevisions))
            }
          }
        }});

        console.log(chalk["yellow"](`Created Postman API with name: ${catalogItem.name}`));

        //TODO check if the version is latestVersion exists
        
        //crete the version
        let createdAPIVersion = await this.postmanAPIRequest({method: 'POST', path: `/apis/${createdAPI.api.id}/versions`, opts : {
          json: {
            version: {
              name: catalogItem.latestVersion
            }
          }
        }});

        console.log(chalk["yellow"](`Created Postman API version: ${catalogItem.latestVersion} for API ${catalogItem.name}`));

        //attach the API schema
        let createdSchema = await this.postmanAPIRequest({method: 'POST', path: `/apis/${createdAPI.api.id}/versions/${createdAPIVersion.version.id}/schemas`, opts : {
          json: {
            schema: {
              languge: 'json',
              schema: JSON.stringify(await this.getCatalogItemRevisionSpec(centralToken, teamId, catalogItem.definitionSubType, catalogItem.id, Math.max(...catalogItem.availableRevisions))),
              type: catalogItem.definitionSubType === 'oas3' ? 'openapi3' : 'openapi2'
            }
          }
        }});

        let collectionName = `AMPLIFY - ${catalogItem.name}`;
        await this.postmanAPIRequest({method: 'POST', 
            path: `/apis/${createdAPI.api.id}/versions/${createdAPIVersion.version.id}/schemas/${createdSchema.schema.id}/collections?workspace=${this.config.workspaceId}`, opts : {
          json: {
            name: collectionName,
            relations: [{type:'documentation'}]
          }
        }});

        console.log(chalk["yellow"](`Generated Postman Collection ${collectionName} for API ${catalogItem.name} with version ${catalogItem.latestVersion} `));
      }


      // Setup for next loop or to exit
      page++;
      canPage = catalogItems.length > 0;
    }
  }

  
  private async unifiedCatalogAPI(readOpts: ReadOpts = {}, teamId:string, token: string): Promise<any> {
    // fetchs apis
    const { size = 20, page = 1, path = '/', opts = {} } = readOpts;
    const qs = `?size=${size}&page=${page}`;
    let url = `https://apicentral.axway.com/api/unifiedCatalog/v1${path.startsWith('/') ? path : '/' + path}${qs}`;

    return requestPromise({
      method: 'GET',
      json: true,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Axway-Tenant-Id': this.config.organizationId,
				'X-Axway-Team-Id': teamId
      },
      ...opts,
      ...this.proxySettings
    })
  }

  /**
   * Reads the Unified Catalog apis, returns { apis: object, canPage: bool }
   * @param pageOptions object containing page info
   */
  private async getCatalogItemsPage(pageOptions: getPageConfig, teamId: string, token: string) {    
    const { page, size } = pageOptions;

    // List all APIs for the specific page and page size
    return await this.unifiedCatalogAPI({
      page,
      size,
      path: '/catalogItems?sort=metadata.modifyTimestamp,DESC&query=definitionType==API;definitionSubType=in=(swaggerv2,oas3)'
    }, teamId, token);
  }


  private async getTokenFromAmplifyCli(orgId:String) {
		let authOutput = JSON.parse((await exec('amplify auth list --json')).stdout);
		for (let details of authOutput) {
			if (details.org && details.org.org_id && details.org.org_id === orgId) {
				return details.tokens.access_token;
			}
		}
		throw new Error(`No Auth details found for org ${orgId}`);
  }

	// Get a catalog item revision property
	private async getCatalogItemRevisionSpec(token: string, teamId:string, catalogItemSubtype:string, catalogItemId:string, revisionNumber:number) {
		let specPropertyName = (function(catalogItemSubtype) {
			switch (catalogItemSubtype) {
				case 'swaggerv2':
					return 'swagger';
				case 'oas3':
				default:
					throw new Error(`Unsupported catalog item definition sub type: ${catalogItemSubtype}`)
			}
    })(catalogItemSubtype);

    return await this.unifiedCatalogAPI({
      path: `/catalogItems/${catalogItemId}/revisions/${revisionNumber}/properties/${specPropertyName}`
    }, teamId, token);
	}

	private async getCatalogItemRevisionDocumentation(token:string, teamId: string, catalogItemId:string, revisionNumber: number) {
    return await this.unifiedCatalogAPI({
      path:  `/catalogItems/${catalogItemId}/revisions/${revisionNumber}/properties/documentation`
    }, teamId, token);
	}

	//platform call
	private async getPlatformTeamDetails(token:string, teamName:string) : Promise<any>  {
		return requestPromise({
			method: 'GET',
			url: `https://platform.axway.com/api/v1/team?name=${teamName}`,
			headers: { Authorization: `Bearer ${token}` }
		});
	}

}
