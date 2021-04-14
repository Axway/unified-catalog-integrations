# @axway/swaggerhub-extension

Amplify Central CLI extension for downloading and creating Amplify Central resources for Swaggerhub.

**For more documentation and examples please visit [Unified Catalog integrations](https://github.com/Axway/unified-catalog-integrations).**

# Disclaimer

This extension is example code and comes with no guarantee of support or maintenance.

# PreReqs

This assumes you already have npm installed and have swaggerhub setup. Visit [NodeJS](https://nodejs.org/) to learn how to install NodeJS. If you need help with getting your swaggerhub settings, you can view the Setup section of the local [DEVREADME.MD](DEVREADME.md)

# Installation

Assuming you are familiar with [Node.js](https://nodejs.org) and [npm](https://npmjs.com), you should first install the [Axway Amplify CLI](https://npmjs.com/package/axway), which will give you connectivity to the [Axway Amplify Platform](https://www.axway.com/en/products/amplify). Note that you must first have an account on [https://platform.axway.com](https://platform.axway.com/), and be provisioned in Amplify Central:

```bash
$ [sudo] npm install -g axway
```

Use the Amplify package manager command to install the Amplify Central CLI:

```bash
$ axway pm install @axway/axway-central-cli
```

You can then install the @axway/amplify-central-swaggerhub-extension:

```
$ npm install @axway/amplify-central-swaggerhub-extension
$ axway central config set extensions.swaggerhub <path to where you installed module>
```

# Getting started

You must be logged into the Axway Amplify Platform before uploading any generated resource files. You'll also need to setup a Service (DOSA) account. To find out how to create one visit [Get started with Amplify CLI](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/cli_getstarted/index.html). Log in to the [Axway Amplify Platform](https://www.axway.com/en/products/amplify) using the following command:

```bash
$ axway auth login --client-id <DOSA Service Account> --secret-file <Private Key>
```

To see available help, options and examples add `-h` or `--help` option on any command:

```bash
$ axway auth logout -h
```

# General usage

There are two main extension commands; `config` and `resources`. You can run each command with a `-h` to get help on that specific command.

```bash
$ axway central swaggerhub-extension -h
USAGE: axway central swaggerhub-extension <command> [options]

Create Amplify Central resources from Swaggerhub API Management APIs

AMPLIFY CENTRAL EXTENSION FOR SWAGGERHUB API MANAGEMENT COMMANDS:
  config  Manage Swaggerhub Extension Configuration
  resources  Generate resources from Swaggerhub API Management APIs
```

# Commands reference:

## CONFIG

The `config` command is utilized to configure the extension prior to generating resources. There are two config sub-commands; `list` and `set`.

```bash
$ axway central swaggerhub-extension config -h
USAGE: axway central swaggerhub-extension config <command> [options]

Manage Swaggerhub Extension Configuration

CONFIG COMMANDS:
  list  View Amplify Central swaggerhub-extension configuration
  set  Set Amplify Central swaggerhub-extension configuration
```

### config examples:

```bash
# set output dir for the generated resources:
$ axway central swaggerhub-extension config set --output-dir=<directory>
# view config:
$ axway central swaggerhub-extension config list
# view list of available options
$ axway central swaggerhub-extension config set -h

SET OPTIONS:
  --environment-name=<value>  Required: Set environment name to create
  --icon=<value>  Set absolute path for custom icon
  --output-dir=<value>  Set absolute path for output directory
  --owner=<value>  Required: Set your Swagger Hub owner name
  --root-url=<value>  Required: Set Swagger Hub root url
```

---

## RESOURCES

The `resources` command is utilized to generate swaggerhub resources for Central. There is one resources sub-command: `generate`

```bash
$ axway central swaggerhub-extension resources -h

USAGE: axway central swaggerhub-extension resources <command> [options]

Generate resources from Swaggerhub API Management APIs

RESOURCES COMMANDS:
  generate
```

### resources examples:

```bash
$ axway central swaggerhub-extension resources generate
```

### Generated Files

The generate command will create Amplify Central resource files for your configured Swaggerhub instance. These files will generated into either `./resources` or the directory you configured with the `--output-dir` configuration setting.

After generating these files you can modify and upload them to Amplify Central with the `axway central create -f=<file>` command. You'll want be sure to upload any Environment files before other generate resources.

```bash
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
