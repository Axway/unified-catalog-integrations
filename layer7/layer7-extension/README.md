# @axway/amplify-central-Layer7-extension

AMPLIFY Central CLI extension for downloading and creating AMPLIFY Central resources from Layer7.

**For more documentation and examples please visit [Unified Catalog integrations](https://github.com/Axway/unified-catalog-integrations).**

# Disclaimer

This extension is example code and comes with no guarantee of support or maintenance.

# Prerequisites

This assumes you already have Node.js installed and Layer7 acces with either a client_id and client_secret. Look at the ```config set -h``` command below for required configs


# Installation

Assuming you are familiar with [Node.js](https://nodejs.org) and [npm](https://npmjs.com), you should first install the [Axway Amplify CLI](https://npmjs.com/package/axway), which will give you connectivity to the [Axway AMPLIFY Platform](https://www.axway.com/en/products/amplify). Note that you must first have an account on [https://platform.axway.com](https://platform.axway.com/), and be provisioned in AMPLIFY Central:

```bash
$ [sudo] npm install -g axway
```

Use the Amplify package manager command to install the AMPLIFY Central CLI:

```bash
$ axway pm install @axway/axway-central-cli
```

You can then install the @axway/amplify-central-layer7-extension:

```bash
$ npm install @axway/amplify-central-layer7-extension
$ axway central config set extensions.layer7-extension <path to where you installed module>
```


# Getting started

You must be logged into the Axway Amplify Platform before uploading any generated resource files. 
Refer to the Axway Central CLI [documentation](https://docs.axway.com/bundle/amplify-central/page/docs/integrate_with_central/cli_central/cli_install/index.html) for more information.

# General usage

There are two main extension commands; `config` and `resources`. You can run each command with a `-h` to get help on that specific command.

```bash
$ axway central layer7-extension -h
USAGE: axway central layer7-extension <command> [options]

Create Amplify Central resources from layer7 resources

AMPLIFY CENTRAL EXTENSION FOR Layer7 COMMANDS:
  config  Manage Layer7 Extension Configuration
  resources  Generate resources from Layer7
```

# Commands reference:

## CONFIG

The `config` command is utilized to configure the extension prior to generating resources. There are two config sub-commands; `list` and `set`.

```bash
$ axway central layer7-extension config -h
USAGE: axway central layer7-extension config <command> [options]

Manage Layer7 Extension Configuration

CONFIG COMMANDS:
  list  View Amplify Central Layer7-extension configuration
  set  Set Amplify Central Layer7-extension configuration
```

### config examples:

```bash
# set output dir for the generated resources:
$ axway central layer7-extension config set --output-dir=<directory>
# view config:
$ axway central layer7-extension config list
# view list of available options
$ axway central layer7-extension config set -h

SET OPTIONS:
  --base-url=<value>  Required: Portal baseurl. Example: https://host:port/ssg
  --client-id=<value>  Required: Client id for fetching APIs
  --client-secret=<value>  Required: Client secret for fetching APIs
  --environment-name=<value>  Required: Set environment name to create
  --icon=<value>  Set absolute path for custom icon
  --output-dir=<value>  Set absolute path for output directory
  --webhook-url=<value>  Required: Set webhook url to use
  
```

---

## RESOURCES

The `resources` command is utilized to generate github resources for Central. There is one resources sub-command: `generate`

```bash
$ axway central layer7-extension resources -h

USAGE: axway central layer7-extension resources <command> [options]

Generate resources from Layer7

RESOURCES COMMANDS:
  generate
```

### resources examples:

```bash
$ axway central layer7-extension resources generate
```

### Generated Files

The generate command will create Amplify Central resource files. These files will generated into either `./resources` or the directory you configured with the `--output-dir` configuration setting.

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
