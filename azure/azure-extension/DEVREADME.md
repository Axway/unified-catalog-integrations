# Azure Extension

## Disclaimer

This extension is example code and comes with no guarantee of support or maintenance. 

## Setup

If you are just trying to setup a test environment within Azure you can follow these steps.

1. Login to portal.azure.com
2. Visit [The subscriptions page](https://portal.azure.com/#blade/Microsoft_Azure_Billing/SubscriptionsBlade) and signup for a free-trial
3. Visit [The management page](https://portal.azure.com/#create/Microsoft.ApiManagement) and create a Resource Group. This will take 20+ min to deploy
4. Navigate inside your Resource Group and click 'APIs' in the left menu.
5. Create a desired API
6. Instal Azure CLI from [their website](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest)
7. login with `az login`
8. Create client with `az ad sp create-for-rbac -n https://<replaceme>.azure-api.net --scopes /subscriptions/<your subid>/resourcegroups/<your resourcegroup>`
9. The resulting `tenant`, `password`, `appId` are the cli params `--tenant-id`, `--client-secret`, and `--client-id` respectively.

## Debugging

The extension comes with 2 example VSCode launch configurations [Debug Azure Tests, Debug Azure Generate].

## Installing/Building/Testing/Extending

**Install Dependencies**

``yarn``

**Build**

``yarn build``

**Test**

``yarn test``

**Extending**

The extension src framework/commands is written in TS but the code responsible for fetching and generating the resource files are written in JS inside `service.js`. You can modify the code at-will and build with `yarn build`.