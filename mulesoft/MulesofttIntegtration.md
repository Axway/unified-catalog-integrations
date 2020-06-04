### Discover assets from Mulesoft Anypoint Exchange and configure custom approval flows


The basic use case is as follows:

**API Provider**
* Will publish APIs and other assets into the Unified Catalog via CLI.  Those APIs will require manual approval of subscription requests from consumers.
* Is notified in Microsoft Teams when there is a new subscription requests, and will approve or reject the request. 

**API Consumer**
* Discovers the API in the Unified Catalog and request access by subscribing.
* On approval, a subscription key will be created in Mulesoft and the key will be sent to the API Consumer's email. After the key has been sent, the state of the Subscription in Unified Catalog gets updated to Active and the Consumer can now use the API with the key that was received over email. 
* Can cancel the subscription from the Unified Catalog. When cancelled, the subscription in Mulesoft will be removed and the state of the Unified Catalog will be updated to unsubscribed, indicating the consumer will no longer be able to use the API with the key received. 
  
![Use Case Diagram](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/Azure2UnifiedCatalogDiagram.png)
  
The technologies that were used for this project: 

* [AMPLIFY Unified Catalog](https://docs.axway.com/bundle/axway-open-docs/page/docs/catalog/index.html) as the central place to publish and discover the APIs. 
* [AMPLIFY Central CLI](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/cli_getstarted/index.html) to fetch the APIs from Mulesoft Anypoint Exchange and promote them to the Unified Catalog. 
* [Integration Builder](https://www.axway.com/en/products/application-integration) to implement the logic for the subscription management and email notifications. 
* API Builder service running in [ARS](https://www.axway.com/en/platform/runtime-services) to keep an authenticated user credentials green. 
* MS Teams for notifications and approval or rejection of subscription requests. 

### Azure API Management to Unified Catalog import script
This is a **Node.js** script that fetches the APIs from Mulesoft Anypoint Exchange and builds the resources needed to publish to the AMPLIFY Unified Catalog.  The following set of resources were configured. 

* **Environment** groups the set of APIs that are fetched from Mulesoft Anypoint Exchange. An environment represents the logical grouping of APIs. 
* **Webhook** defines the webhook URL that will be invoked to post a notification in Microsoft Teams and update the subscription in Mulesoft.
* **Secret** provides key value pairs of named secrets that are used to secure your webhooks. Setting a webhook secret allows you to ensure that POST requests sent to the payload URL are from Axway. 
* **ConsumerSubscriptionDefinition** allows the configuration of the data needed from a consumer to subscribe to the API from the Unified Catalog.  It also has a reference to the webhook that will get invoked on subscription, and it is referenced in the ConsumerInstance resources. 
* **APIService** holds all the information needed to represent your API (image, description, markdown documentation etc). 
* **APIServiceRevision** holds the OAS specification file. Multiple revisions can be created. 
* **APIServiceInstance** contains the endpoints (host and port information) where the API is deployed.
* **ConsumerInstance**  contains all the details for creating the asset in the Unified Catalog. It also contains a reference to the ConsumerSubscriptionDefinition that has the link to the webhook. That means that for each Subscription Update event generated from Unified Catalog related to the Catalog Item created from the ConsumerInstance, the webhook will get invoked

The above resources structure map to the API Server REST API resources as defined in the API Server [OAS3 specs](https://apicentral.axway.com/apis/docs).

![API Server Data Model](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/APIServerResourcesDataModel.png)


 
### Microsoft Teams flow to Approve / Reject subscription requests
The flow will send notifications to MS teams channel as an Active card when a consumer subscribes to the API from the Unified Catalog. The API provider can then approve or reject the subscription requests from within the MS Active card. This action will trigger the Integration Builder flow, as a post execution step. 
The MS flow will also post notifications in the channel for any subscription updates. 

Check this [wiki page](https://github.com/Axway/mulesoft-catalog-integration/wiki/Configure-Microsoft-Flow-for-receiving-AMPLIFY-Unified-Catalog-Subscription-events) to learn how to configure the MS Flow. 

![MS Teams Adaptive Card](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MSTeamsAdaptiveCard.png)

### Integration Builder flow to update subscriptions and send email notifications
This Integration Builder flow will receive the approve or reject requests from Microsoft Teams and unsubscribe requests from Unified Catalog,  then will subscribe / unsubscribe the consumer to the APIs in Mulesoft. It will also send email notifications to the user with the key to authenticate the API calls. The flow will call the API Builder app with get a valid Bearer token, then updates the Subscription states in Unified Catalog.

Check this [wiki page](https://github.com/Axway/mulesoft-catalog-integration/wiki/Configure-Integration-Builder-flow-to-update-subscriptions-in-Mulesoft-and-send-email-notifications-to-subscribers) to learn how to configure the flow. 

![Integration Builder Flow](https://github.com/Axway/mulesoft-catalog-integration/blob/master/images/MulesoftRegitrationFlow.png)
