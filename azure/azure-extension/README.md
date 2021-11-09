# @axway/amplify-central-azure-extension

Amplify Central CLI extension for downloading and creating Amplify Central resources for Azure.

**For more documentation and examples please visit [Unified Catalog integrations](https://github.com/Axway/unified-catalog-integrations).**

# Disclaimer

This extension is example code and comes with no guarantee of support or maintenance.

# PreReqs

This assumes you already have npm installed and have an azure account setup. Visit [NodeJS](https://nodejs.org/) to learn how to install NodeJS. If you need help with setting up your azure account, you can view the Setup section of the local [DEVREADME.MD](DEVREADME.md)

# Installation

Assuming you are familiar with [Node.js](https://nodejs.org) and [npm](https://npmjs.com), you should first install the [Axway Amplify CLI](https://npmjs.com/package/axway), which will give you connectivity to the [Axway Amplify Platform](https://www.axway.com/en/products/amplify). Note that you must first have an account on [https://platform.axway.com](https://platform.axway.com/), and be provisioned in Amplify Central:

```bash
$ [sudo] npm install -g axway
```

Use the Amplify package manager command to install the Amplify Central CLI:

```bash
$ axway pm install @axway/axway-central-cli
```

You can then install the @axway/amplify-central-azure-extension:

```bash
$ npm install @axway/amplify-central-azure-extension
$ axway central config set extensions.azure <path to where you installed module>
```

# Getting started

You must be logged into the Axway Amplify Platform before uploading any generated resource files. 
Refer to the Axway Central CLI [documentation](https://docs.axway.com/bundle/amplify-central/page/docs/integrate_with_central/cli_central/cli_install/index.html) for more information.


# General usage

There are two main extension commands; `config` and `resources`. You can run each command with a `-h` to get help on that specific command.

```bash
$ axway central azure-extension -h
USAGE: axway central azure-extension <command> [options]

Create Amplify Central resources from Azure API Management APIs

AMPLIFY CENTRAL EXTENSION FOR AZURE API MANAGEMENT COMMANDS:
  config  Manage Azure Extension Configuration
  resources  Generate resources from Azure API Management APIs
```

# Commands reference:

## CONFIG

The `config` command is utilized to configure the extension prior to generating resources. There are two config sub-commands; `list` and `set`.

```text
$ axway central azure-extension config -h
USAGE: axway central azure-extension config <command> [options]

Manage Azure Extension Configuration

CONFIG COMMANDS:
  list  View Amplify Central azure-extension configuration
  set  Set Amplify Central azure-extension configuration
```

### config examples:

```bash
# set output dir for the generated resources:
$ axway central azure-extension config set --output-dir=<directory>
# view config:
$ axway central azure-extension config list
# view list of available options
$ axway central azure-extension config set -h

SET OPTIONS:
  --client-id=<value>  Required: Set your Azure Client ID
  --client-secret=<value>  Required: Set your Azure Client Secret
  --environment-name=<value>  Required: Set environment name to create
  --filter=<value>  Set your filtering options, currently only supports a tag. Ex: --filter tags=myTag
  --icon=<value>  Set absolute path for custom icon
  --output-dir=<value>  Set absolute path for output directory
  --resource-group-name=<value>  Required: Set your Azure Resource Group Name
  --service-name=<value>  Required: Set your Azure Service Name
  --subscription-id=<value>  Required: Set your Azure Subscription ID
  --tenant-id=<value>  Required: Set your Azure Tenant ID
  --webhook-url=<value>  Set webhook url to use
```

---

## RESOURCES

The `resources` command is utilized to generate azure resources for Central. There is one resources sub-command: `generate`

```text
$ axway central azure-extension resources -h

USAGE: axway central azure-extension resources <command> [options]

Generate resources from Azure API Management APIs

RESOURCES COMMANDS:
  generate
```

### resources examples:

```
$ axway central azure-extension resources generate
```

### Generated Files

The generate command will create Amplify Central resource files for your configured Azure instance. These files will generated into either `./resources` or the directory you configured with the `--output-dir` configuration setting.

After generating these files you can modify and upload them to Amplify Central with the `axway central create -f=<file>` command. You'll want be sure to upload any Environment files before other generate resources.

```
$ axway central create -h
USAGE: axway central create <command> [options]

Create a resource from a file. JSON and YAML formats are accepted.

CREATE COMMANDS:
  environment   Create an environment with the specified name.

CREATE OPTIONS:
  --client-id=<value>   Override your DevOps account's client ID
  -f,--file=<path>      Filename to use to create the resource
  -o,--output=<value>   Additional output formats. One of: yaml | json
```

### create example:

```bash
# Upload the Environment, Webhook, and ConsumerSubscriptionDefinition
axway central create -f=~/Desktop/Environment.yaml
# Upload the APIService, APIServiceRevision, APIServiceInstance, and ConsumerInstance
axway central create -f=~/Desktop/APIService-swagger-petstore.yaml
```

---

## Author

Axway <support@axway.com> https://axway.com

---

## License

Copyright 2021 Axway

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
