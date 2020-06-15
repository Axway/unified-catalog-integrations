### Discover assets from Mulesoft Anypoint Exchange and configure custom approval flows


The basic use case is as follows:

**API Provider**
* Will publish APIs and other assets into the Unified Catalog via CLI.  Those APIs will require manual approval of subscription requests from consumers.
* Is notified in Microsoft Teams when there is a new subscription requests, and will approve or reject the request. 

**API Consumer**
* Discovers the API in the Unified Catalog and request access by subscribing.
* On approval, a subscription key will be created in Mulesoft and the key will be sent to the API Consumer's email. After the key has been sent, the state of the Subscription in Unified Catalog gets updated to Active and the Consumer can now use the API with the key that was received over email. 
* Can cancel the subscription from the Unified Catalog. When cancelled, the subscription in Mulesoft will be removed and the state of the Unified Catalog will be updated to unsubscribed, indicating the consumer will no longer be able to use the API with the key received. 
  
<img src="https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MulesoftIntegrationDiagram.PNG" width="700" height="400" />
 
Watch the [demo video](https://youtu.be/R4SPnhTp6TE) as we break down and explain the Mulesoft to Unified Catalog integration.

The technologies that were used for this project: 

* [AMPLIFY Unified Catalog](https://docs.axway.com/bundle/axway-open-docs/page/docs/catalog/index.html) as the central place to publish and discover the APIs. 
* [AMPLIFY Central CLI](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/cli_getstarted/index.html) to fetch the APIs from Mulesoft Anypoint Exchange and promote them to the Unified Catalog. 
* [Integration Builder](https://www.axway.com/en/products/application-integration) to implement the logic for the subscription management and email notifications. 
* API Builder service running in [ARS](https://www.axway.com/en/platform/runtime-services) to keep an authenticated user credentials green. 
* MS Teams for notifications and approval or rejection of subscription requests. 
* Mulesoft Anypoint Exchange.

Follow the steps bellow to use this example: 

### Step 1: Configure a token provider service in API Builder

***

This service is used to authenticate from Integration Builder to AMPLIFY Central, and keep the authenticated user credentials green.  It will expose a `GET /token` endpoint that will return the current `access_token` for the configured credentials. This `access_token` is then used by the Integration Builder flow to allow it to call AMPLIFY Central APIs. The service was created with API Builder and deployed to AMPLIFY Runtime Services ( ARS ). 

**Pre-requisites**
*  **AMPLIFY Runtime Service** enabled on your AMPLIFY platform account. To enable your ARS trial, navigate to https://platform.axway.com and select _Start Free Trial_ under the _Application Development_ tile, from "Service Offerings & Products". 

To configure the token provider service:

1. Download the TokenProvider service from this [repo](https://github.com/Axway/unified-catalog-integrations/tree/master/tokenprovider). 
2. Setup the acs cli by running the following commands sequence:
```poweshell
npm install -g acs
acs login
acs new tokenprovider --force
```
3. Config the port with the following command: `acs config --set PORT=8080 tokenprovider`
4. Build your tokenprovider image by running 
```powershell
docker build --tag tokenprovider ./
```

5. Publish the tokenprovider image
```powwershell
acs publish tokenprovider --delete_oldest --force --image tokenprovider --app_version 0.1
```
You should get back the HOST ENDPOINT where the token provider service will be published. 

6. Configure the OAuth callback 
```powershell
acs config --set CALLBACK_URI={HOST ENDPOINT}/auth/callback 
``` 
You will be asked to restart the service . Type `yes` when prompted to restart. 

7. Initiate the access/refresh tokens from the API Builder console. 
   * Navigate to `{HOST ENDPOINT}/console/project/credentials` and login with `username: admin `, `password: the apikey from default.js file`. We recommend updating the _default.js_ with a new unique _apikey_.  
   * Click Authorize/Re-authorize. 
   * Login with AxwayID. 
8. You can Test the service by with
```powershell
curl -H 'APIKey: <YOUR APIKEY>' {HOST ENDPOINT}/api/token
```

9. To monitor your service run
```powershell
acs list tokenprovider
acs logcat tokenprovider
```

To shutdown the service, run the following command: `acs unpublish tokenprovider`. 

### Step 2: Configure Integration Builder flow to update subscriptions and send email notifications
***

This Integration Builder flow will receive the approve or reject requests from Microsoft Teams and unsubscribe requests from Unified Catalog,  then will subscribe / unsubscribe the consumer to the APIs in Mulesoft. It will also send email notifications to the user with the key to authenticate the API calls. The flow will call the API Builder app to get a valid Bearer token, then updates the Subscription states in Unified Catalog.

> Note: If you don't want or cannot use Microsoft Teams for subscription notifications: 
> * Use this flow **[MuleSoft_Registration_Flow_No_MSTeams.json](https://github.com/Axway/unified-catalog-integrations/blob/master/mulesoft/MuleSoft_Registration_Flow_No_MSTeams.json)** and skip **Step 3: Microsoft Teams flow to Approve / Reject subscription requests**. 

To configure the Integration Builder flow, follow this steps: 

1. Download the Integration Builder flow **[MuleSoft Registration Flow.json](https://github.com/Axway/mulesoft-catalog-integration/blob/master/integrationbuilder/MuleSoft%20Registration%20Flow.json)** from this repo.  
2. Navigate to [Integration Builder](https://sandbox-ib.platform.axway.com/welcome) on the [AMPLIFY Platform](https://platform.axway.com/).  
3. Import the flow as a Flow template. 
   * Go to `Flows`, click on `Build new flow template`. 
   * Select `Import` and choose the flow that you downloaded in the previous step.  
   * Provide a `Name` and click on `Create' to save your flow template. 
4. Configure a flow instance to send email notifications to Outlook. 
   * From `Connectors`, search for `Outlook Email` connector in the search box.
   * Select the `Outlook Email` connector and click `Authenticate`. 
   * Provide a `Name` and click on `Create instance`. You will be redirected to authenticate with your Outlook credentials.
   * Go to `Instances` and look for the connector instance that you just created. 
5. Create a flow instance to replace the Value variables in the template with specific values to connect to your Mulesoft environment and AMPLIFY platform tenant. 
* Navigate to `Flows`, select your flow template and click `Create Instance'. 
* Provide a `Name` for the instance. 
* Select the `outlookEmail` connector instance that you created at Step 4. 
* Provide values for all required Variables:
  * `apiCentralTokenCredentials`: The apikey from default.js file in the `API Builder tokenProvider` service. Please refer to **Step 1: Configure a token provider service in API Builder.**
  * `apiCentralTokenUrl`: The ENDPOINT URL of the `API Builder tokenProvider` service. Please refer to **Step 1: Configure a token provider service in API Builder.**
  * `muleSoftOrgID`: The organization id of your Mulesoft Anypoint account. 
  * `muleSoftUserName`: The username for your Mulesoft Anypoint account. 
  * `muleSoftPassword`:The password for your Mulesfot Anypoint account.   
  * `apiCentralUrl`: The link to your AMPLIFY Central environment. For production use https://apicentral.axway.com. 
  * `platformUrl`: Set the url to your AMPLIFY platform account. For production use: https://platform.axway.com. 
* Select `Create instance`. Please make sure to save the instance id. You will need it later.
Watch the [demo video](https://youtu.be/0mJXeD_zJhI) as we break down and explain how to import and configure the flow template.

### Step 3: Microsoft Teams flow to Approve / Reject subscription requests
***

**AMPLIFY Central Unified Catalog** has the option to configure Webhooks that can be invoked when Consumers of Catalog asset update their subscriptions. This flow will send notifications to MS teams channel as an Active card when a consumer subscribes to the API from the Unified Catalog. The API provider can then approve or reject the subscription requests from within the MS Active card. This action will trigger the Integration Builder flow, as a post execution step. 
The MS flow will also post notifications in the channel for any subscription updates. 

<img src="https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSTeamsAdaptiveCard.png" width="440" height="500" />

**Pre-requisite:** 
* You'll need [Microsoft Flow](https://flow.microsoft.com), with a Free Trial account at a minimum to be able to create the flow. 

**Follow the these steps, to configure the flow:**

1. Navigate to [Microsoft Flow](https://flow.microsoft.com).
2. Create the Webhook entry point that Unified Catalog will send the events to. 
    * Go to "My flows". 
    * Create an `Instant flow`, provide a `name` and select `When an HTTP request is received` as an entry point.
    * In the request json body schema, copy and paste the Subscription Updated Event schema below: 

```json
{
        "type": "object",
        "properties": {
            "id": {
                "type": "string"
            },
            "time": {
                "type": "string"
            },
            "version": {
                "type": "string"
            },
            "product": {
                "type": "string"
            },
            "correlationId": {
                "type": "string"
            },
            "organization": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string"
                    }
                }
            },
            "type": {
                "type": "string"
            },
            "payload": {
                "type": "object",
                "properties": {
                    "consumerInstance": {
                        "type": "object",
                        "properties": {
                            "kind": {
                                "type": "string"
                            },
                            "name": {
                                "type": "string"
                            },
                            "tags": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            },
                            "group": {
                                "type": "string"
                            },
                            "metadata": {
                                "type": "object",
                                "properties": {
                                    "id": {
                                        "type": "string"
                                    },
                                    "audit": {
                                        "type": "object",
                                        "properties": {
                                            "createUserId": {
                                                "type": "string"
                                            },
                                            "modifyUserId": {
                                                "type": "string"
                                            },
                                            "createTimestamp": {
                                                "type": "string"
                                            },
                                            "modifyTimestamp": {
                                                "type": "string"
                                            }
                                        }
                                    },
                                    "scope": {
                                        "type": "object",
                                        "properties": {
                                            "id": {
                                                "type": "string"
                                            },
                                            "kind": {
                                                "type": "string"
                                            },
                                            "name": {
                                                "type": "string"
                                            }
                                        }
                                    },
                                    "references": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "id": {
                                                    "type": "string"
                                                },
                                                "kind": {
                                                    "type": "string"
                                                },
                                                "name": {
                                                    "type": "string"
                                                },
                                                "type": {
                                                    "type": "string"
                                                }
                                            },
                                            "required": [
                                                "id",
                                                "kind",
                                                "name",
                                                "type"
                                            ]
                                        }
                                    },
                                    "resourceVersion": {
                                        "type": "string"
                                    }
                                }
                            },
                            "apiVersion": {
                                "type": "string"
                            },
                            "attributes": {
                                "type": "object",
                                "properties": {
                                    "release": {
                                        "type": "string"
                                    }
                                }
                            }
                        }
                    },
                    "subscription": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string"
                            },
                            "name": {
                                "type": "string"
                            },
                            "userId": {
                                "type": "string"
                            },
                            "properties": {
                                "type": "object",
                                "additionalProperties": true
                            },
                            "metadata": {
                                "type": "object",
                                "properties": {
                                    "createUserId": {
                                        "type": "string"
                                    }
                                }
                            },
                            "currentState": {
                                "type": "string"
                            },
                            "owningTeamId": {
                                "type": "string"
                            },
                            "relationships": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "key": {
                                            "type": "string"
                                        },
                                        "path": {
                                            "type": "string"
                                        },
                                        "spec": {
                                            "type": "string"
                                        },
                                        "type": {
                                            "type": "string"
                                        },
                                        "value": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "key",
                                        "path",
                                        "spec",
                                        "type",
                                        "value"
                                    ]
                                }
                            },
                            "nextPossibleStates": {
                                "type": "array"
                            },
                            "currentStateDescription": {
                                "type": "string"
                            }
                        }
                    },
                    "catalogItem": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string"
                            },
                            "name": {
                                "type": "string"
                            },
                            "owningTeamId": {
                                "type": "string"
                            },
                            "relationships": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "key": {
                                            "type": "string"
                                        },
                                        "path": {
                                            "type": "string"
                                        },
                                        "spec": {
                                            "type": "string"
                                        },
                                        "type": {
                                            "type": "string"
                                        },
                                        "value": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "key",
                                        "path",
                                        "spec",
                                        "type",
                                        "value"
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        }
    }
```

![](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSFlow-Step1.PNG)

> Note: You will use the HTTP POST URL at Step 4: Install and configure @axway/mulesoft-extension, to configure the webhook. 

3. Add an extra step of type `Control`, action type `Condition`. 
   * Set the the value for the `Condition`, by searching `currentState` using the `Add dynamic content`. 
   * Set the operator to `is equal to` and value set to `REQUESTED`.

![](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSFlow-Step2.PNG)

4. Set up the Adaptive card. The subscription requests will be Approved or Rejected based on the response of the action in the Adaptive Card. 
   * On the `If yes` branch, select `Add a new action` of type `Post an Adaptive Card to a Teams channel and wait for the response`.
   * Configure the `Team` and the `Channel` where the card would be posted.
   * Copy-paste the text below in `Message` box: 

 ```json
    {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.0",
        "body": [
            {
                "type": "Container",
                "items": [
                    
                    {
                        "type": "TextBlock",
                        "text": "Subscription requested",
                        "weight": "Bolder",
                        "size": "Medium"
                    },
                    {
                        "type":"Image",
                        "url":"https://upload.wikimedia.org/wikipedia/commons/5/5a/Axway_Logo.png",
                        "spacing": "Small",
                        "horizontalAlignment": "Center",
                        "height": "stretch",
                        "size": "Medium"
                    }
                ]
            },
            {
                "type": "Container",
                "style": "accent",
                "items": [
                    {
                        "type": "FactSet",
                        "facts": [
                            {
                                "title": "Catalog Item",
                                "value": "@{triggerBody()?['payload']?['catalogItem']?['name']}"
                            },
                            {
                                "title": "Subscription",
                                "value": "@{triggerBody()?['payload']?['subscription']?['name']}"
                            },
                            {
                                "title": "Message",
                                "value": "@{triggerBody()?['payload']?['subscription']?['currentStateDescription']}"
                            },
                            { 
                            "title":"Requested plan",
                            "value": "@{triggerBody()?['payload']?['subscription']?['properties']?['profile']?['plan']}"
                        }
                        ]
                    }
                ]
            },
            {
                "type": "TextBlock",
                "text": "Select your action:",
                "weight": "Bolder",
                "wrap": true
            },
            {
                "type": "Input.ChoiceSet",
                "placeholder": "Enter your action",
                "id": "action",
                "choices": [
                    {
                        "title": "Approve",
                        "value": "approved"
                    },
                    {
                        "title": "Reject",
                        "value": "rejected"
                    }
                ],
                "style": "expanded"
            }
        ],
        "actions": [
            {
                "type": "Action.ShowCard",
                "title": "Submit",
                "card": {
                    "type": "AdaptiveCard",
                    "body": [
                        {
                            "type": "Input.Text",
                            "id": "comment",
                            "isMultiline": true,
                            "placeholder": "Enter your comment"
                        }
                    ],
                    "actions": [
                        {
                            "type": "Action.Submit",
                            "title": "OK"
                        }
                    ],
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                }
            },
            {
                "type": "Action.OpenUrl",
                "title": "Team details",
                "url": "https://apicentral.axway.com/access/teams/detail/@{triggerBody()?['payload']?['subscription']?['owningTeamId']}"
            },
            {
                "type": "Action.OpenUrl",
                "title": "User details",
                "url": "https://platform.axway.com/#/user/@{triggerBody()?['payload']?['subscription']?['metadata']?['createUserId']}"
            },
            {
                "type": "Action.OpenUrl",
                "title": "View Subscription in Unified Catalog",
                "url": "https://apicentral.axway.com/catalog/@{triggerBody()?['payload']?['catalogItem']?['id']}/subscriptions/@{triggerBody()?['payload']?['subscription']?['id']}"
            }
        ],
        "minHeight": "100px"
    }
 ```

   * Set the `Update Message` to: 
 ```js
Subscription "@{triggerBody()?['payload']?['subscription']?['name']}" processed for "@{triggerBody()?['payload']?['catalogItem']?['name']}"
```
   * Set the `Should update card` to `yes`.

![](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSFlow-Step4.PNG)

5. Add an action of type `HTTP` to configure calling to Integration Builder

   * Set `Method`to `POST`
   * Set `URI`to `https://staging.cloud-elements.com/elements/api-v2/formulas/instances/{FLOW_INSTANCE_ID_HERE}/executions`. Please make sure to replace {FLOW_INSTANCE_ID_HERE} with the Flow Instance ID created at Step 2: Configure Integration Builder flow to update subscriptions and send email notifications
   * Set `Headers`to `Content-Type: application/json`<p/>
   * Set the `Body`to
    
    ```js
    {
    "catalogItem": {
        "id": "@{triggerBody()?['payload']?['catalogItem']?['id']}",
        "name": "@{triggerBody()?['payload']?['catalogItem']?['name']}",
        "relationships": @{triggerBody()?['payload']?['catalogItem']?['relationships']}
    },
    "subscription": {
        "id": "@{triggerBody()?['payload']?['subscription']?['id']}",
        "action": "@{body('Post_an_Adaptive_Card_to_a_Teams_channel_and_wait_for_a_response')?['data']?['action']}",
        "message": "@{body('Post_an_Adaptive_Card_to_a_Teams_channel_and_wait_for_a_response')?['data']?['comment']}",
        "userId": "@{triggerBody()?['payload']?['subscription']?['metadata']?['createUserId']}",
        "relationships": @{triggerBody()?['payload']?['subscription']?['relationships']},
        "properties": @{triggerBody()?['payload']?['subscription']?['properties']}
    }
    }
    ```
    
    * Click on `Show advanced options` and set `Authorization` to `Raw`, value being your Integration Builder User and Org secrets: `User ****, Organization ****`

![](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSFlow-Step5.PNG)

6. Add a new Microsoft Teams action as `Post a message as the Flow bot to a channel`. 
   * Select the `Team` and the `Channel`
   * Set the `Message` field to:

    ```js
    Subscription "@{triggerBody()?['payload']?['subscription']?['name']}" on "@{triggerBody()?['payload']?['catalogItem']?['name']}" was sent to be @{body('Post_an_Adaptive_Card_to_a_Teams_channel_and_wait_for_a_response')?['data']?['action']} by "@{body('Post_an_Adaptive_Card_to_a_Teams_channel_and_wait_for_a_response')?['responder']?['displayName']}" (@{body('Post_an_Adaptive_Card_to_a_Teams_channel_and_wait_for_a_response')?['responder']?['email']})
    ```

![](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSFlow-Step6.PNG)

7. Set up the `If no` branch.
    The flow will always post a message to a teams channel when a subscription state changes and the current state is different than `REQUESTED`.
    * Select `Post a message as the Flow bot to a channel` action. 
    * Pick the `Team` and `Channel`
    * Set the `Message` field to:

    ```js
    Subscription "@{triggerBody()?['payload']?['subscription']?['name']}" for "@{triggerBody()?['payload']?['catalogItem']?['name']}" state changed to @{triggerBody()?['payload']?['subscription']?['currentState']}
    ```

![](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSFlow-Step7.PNG)

8. Add a `Control`, `Condition` action. 
   * Set the the value for the `Condition` to `currentState`
   * Set the operator to `is equal to` and value set to `UNSUBSCRIBE_INITIATED`.
 ![](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSFlow-Step8.PNG)

9. On the `If yes` branch, send the event data to Integration Builder.
   * Select a `HTTP` action. 
   * Set the `Method` to `POST`
   * Set the `URI` to `https://staging.cloud-elements.com/elements/api-v2/formulas/instances/{FORMULA_INSTANCE_ID_HERE}/executions`
   * Set the `Headers` to `Content-Type: application/json`
   * Set the `Body`to:
    
    ```js
    {
    "catalogItem": {
        "id": "@{triggerBody()?['payload']?['catalogItem']?['id']}",
        "name": "@{triggerBody()?['payload']?['catalogItem']?['name']}",
        "relationships": @{triggerBody()?['payload']?['catalogItem']?['relationships']}
    },
    "subscription": {
        "id": "@{triggerBody()?['payload']?['subscription']?['id']}",
        "action": "unsubscribeInitiated",
        "userId": "@{triggerBody()?['payload']?['subscription']?['metadata']?['createUserId']}",
        "relationships": @{triggerBody()?['payload']?['subscription']?['relationships']}
    }
    }
    ```
    * Click on `Show advanced options` and set `Authorization` to `Raw`, value being your Integration Builder User and Org secrets: `User ****, Organization ****`

![](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSFlow-Step9.PNG)

10. Save the flow

Watch the [demo video](https://youtu.be/yGwK9_y-GCU) as we break down and explain how to import and configure the flow template.


### Step 4: Install and configure @axway/mulesoft-extension
***

AMPLIFY Central CLI extension to fetch the APIs from Mulesoft Anypoint Exchange and build the resources needed to publish to the AMPLIFY Unified Catalog.  The following set of resources were configured. 

* **Environment** groups the set of APIs that are fetched from Mulesoft Anypoint Exchange. An environment represents the logical grouping of APIs. All resources required for promoting an API to Unified Catalog need to be created under an Environment.
* **Webhook** defines the webhook URL that will be invoked to post a notification in Microsoft Teams and update the subscription in Mulesoft.
* **Secret** provides key value pairs of named secrets that are used to secure your webhooks. Setting a webhook secret allows you to ensure that POST requests sent to the payload URL are from Axway. 
* **ConsumerSubscriptionDefinition** allows the configuration of the data needed from a consumer to subscribe to the API from the Unified Catalog.  It also has a reference to the webhook that will get invoked on subscription, and it is referenced in the ConsumerInstance resources. 
* **APIService** holds all the information needed to represent your API (image, description, markdown documentation etc). 
* **APIServiceRevision** holds the OAS specification file. Multiple revisions can be created. 
* **APIServiceInstance** contains the endpoints (host and port information) where the API is deployed.
* **ConsumerInstance**  contains all the details for creating the asset in the Unified Catalog. It also contains a reference to the ConsumerSubscriptionDefinition that has the link to the webhook. That means that for each Subscription Update event generated from Unified Catalog related to the Catalog Item created from the ConsumerInstance, the webhook will get invoked

The above resources structure map to the API Server REST API resources as defined in the API Server [OAS3 specs](https://apicentral.axway.com/apis/docs).

<img src="https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/APIServerResourcesDataModel.png" width="560" height="200" />

Learn how to install, configure and run the CLI extenstion [here](https://github.com/Axway/unified-catalog-integrations/blob/master/mulesoft/mulesoft-extension/README.md). 

Follow these steps to download and configure the AMPLIFY Centra resources to publish from Mulesoft to Unified Catalog. 
 
**1. Install @axway/mulesoft-extension**

Assuming you are familiar with [Node.js](https://nodejs.org) and [npm](https://npmjs.com), you should first install the [Axway AMPLIFY CLI](https://www.npmjs.com/package/@axway/amplify-cli), which will give you connectivity to the [Axway AMPLIFY Platform](https://www.axway.com/en/products/amplify). Note that you must first have an account on [https://platform.axway.com](https://platform.axway.com/), and be provisioned in AMPLIFY Central. 

```powershell
[sudo] npm install -g @axway/amplify-cli
```

Use the AMPLIFY package manager command to install the AMPLIFY Central CLI:

```powershell
amplify pm install @axway/amplify-central-cli@0.1.3-dev.10
```

With the AMPLIFY Central CLI installed, run this command in the mulesoft-extension directory, assuming you have cloned/downloaded this repo at previous steps.  

```powershell
yarn && yarn build
```
> **Note**: If you get a command not found error for yarn, please run `npm install -g yarn. 

To configure this extension with the AMPLIFY Central CLI:

```powershell
amplify central config set extensions.mulesoft-extension <path_to_your_mulesoft_extension_directory>
```

**2. Configure extension**

Configure the extentions prior to generating the resources. 
You must be logged into the Axway AMPLIFY Platform before uploading any generated resource files. You'll also need to setup a Service (DOSA) account. To find out how to create one, visit [Get started with AMPLIFY CLI](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/cli_getstarted/index.html). 

Log in to the [Axway AMPLIFY Platform](https://www.axway.com/en/products/amplify) using the following command:
```powershell
amplify auth login --client-id <DOSA Service Account> --secret-file <private_key_for_service_account>
```
Example: `amplify auth login --client-id DOSA_105cf15d051c432c8cd2e1313f54c2da --secret-file ~/test/private_key.pem`
 
Set the output directory where you want the resources to be generated. 
```powershell
amplify central mulesoft-extension config set --output-dir <directory_name>
```
Example: `amplify central mulesoft-extension config set --output-dir ./mulesoft-resources`.

Set the environment name: 
```powershell
amplify central mulesoft-extension config set --environment-name <env_name>
```
Example: `amplify central mulesoft-extension config set --environment-name mulesoft-env`

Set the organization id for your Mulesoft account: 
```powershell
amplify central mulesoft-extension config set --master-organization-id <mulesoft_org_id>
```
Choose to fetch the mock endpoints with the APIs in Mulesoft. Set to `false`, you don't want to include the mock endpoints.
```powershell
amplify central mulesoft-extension config set --include-mock-endpoints true
```

Set the Mulesoft username and password: 
```powershell
amplify central mulesoft-extension config set --username <mulesoft_username>
amplify central mulesoft-extension config set --password <mulesoft_password>
```

Set the image for the environment
```powershell
amplify central mulesoft-extension config set --icon <path_to_your_image>
```

Set to publish your Mulesoft assets to the Unified Catalog. By default, it is set to `false`. 
```powershell
amplify central mulesoft-extension config set --generate-consumer-instances true
```

Set the Webhook URL to send the HTTP POST request for a subcription update event.
```powershell
amplify central mulesoft-extension config set --webhook-url MS_FLOW_HTTP_POST_URL
```
> **Note**: If you skipped the MF FLow Step, set the webhook-url to the Integration Builder execution url: `https://staging.cloud-elements.com/elements/api-v2/formulas/instances/{FORMULA_INSTANCE_ID_HERE}/executions`

(Optional) Set the secret if the webhook is secure and needs a key to invoke. Skip this step if you have configured the MS flow. 
```powershell
amplify central mulesoft-extension config set --webhook-secret ${SECRET} 
```
> **Note**: If you skipped the MF FLow Step, the webhook secret will be Integration Builder credentials: User ****, Organization ****

**3. Generate AMPLIFY Central resources**`

The generate command will create AMPLIFY Central resource files for your configured Mulesoft instance. These files will be generated into either `./resources` or the directory you configured with the `--output-dir` configuration setting. 

```
amplify central mulesoft-extension resources generate
```

**4. Fetch the APIs in Mulesoft and publish to Catalog**

After generating these files you can modify and upload them to AMPLIFY Central with the `amplify central create -f=<file>` command. You'll want be sure to upload any Environment files before other generated resources.

```powershell
# Upload the Environment, Webhook, and ConsumerSubscriptionDefinition
amplify central create --file=<path_to_environment_file>
# Upload the APIService, APIServiceRevision, APIServiceInstance, and ConsumerInstance
amplify central create -f=~<path_to_service_yaml_file>
```
Example:
```powershell
# Upload the Environment, Webhook, and ConsumerSubscriptionDefinition
amplify central create -f=~/Desktop/Environment.yaml
# Upload the APIService, APIServiceRevision, APIServiceInstance, and ConsumerInstance
amplify central create -f=~/Desktop/APIService-swagger-petstore.yaml
```

See [@axway/mulesoft-extension](https://github.com/Axway/unified-catalog-integrations/edit/master/mulesoft/mulesoft-extension/README.md) for full list of supported commands. 


