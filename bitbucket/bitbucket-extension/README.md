# @axway/amplify-central-bitbucket-extension

AMPLIFY Central CLI extension for downloading and creating AMPLIFY Central resources from Bitbucket.

**For more documentation and examples please visit [Unified Catalog integrations](https://github.com/Axway/unified-catalog-integrations).**

# Disclaimer

This extension is example code and comes with no guarantee of support or maintenance.

# Prerequisites

This assumes you already have Node.js installed and Bitbucket acces with either an [App Password](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/) or a [personal access token](https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html) set up. Please make sure your your App Password has `Projects:READ` and `Repositories:READ` permissions.


# Installation

Assuming you are familiar with [Node.js](https://nodejs.org) and [npm](https://npmjs.com), you should first install the [Axway AMPLIFY CLI](https://www.npmjs.com/package/@axway/amplify-cli), which will give you connectivity to the [Axway AMPLIFY Platform](https://www.axway.com/en/products/amplify). Note that you must first have an account on [https://platform.axway.com](https://platform.axway.com/), and be provisioned in AMPLIFY Central:

```bash
$ [sudo] npm install -g @axway/amplify-cli
```

Use the AMPLIFY package manager command to install the AMPLIFY Central CLI:

```bash
$ amplify pm install @axway/amplify-central-cli
```

You can then install the @axway/amplify-central-bitbucket-extension:

```bash
$ npm install @axway/amplify-central-bitbucket-extension
$ amplify central config set extensions.bitbucket-extension <path to where you installed module>
```


# Getting started

You must be logged into the Axway AMPLIFY Platform before uploading any generated resource files. You'll also need to setup a Service (DOSA) account. To find out how to create one visit [Get started with AMPLIFY CLI](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/cli_getstarted/index.html). Log in to the [Axway AMPLIFY Platform](https://www.axway.com/en/products/amplify) using the following command:

```bash
$ amplify auth login --client-id <DOSA Service Account> --secret-file <Private Key>
```

To see available help, options and examples add `-h` or `--help` option on any command:

```bash
$ amplify auth logout -h
```

# General usage

There are two main extension commands; `config` and `resources`. You can run each command with a `-h` to get help on that specific command.

```bash
$ amplify central bitbucket-extension -h
USAGE: amplify central bitbucket-extension <command> [options]

Create AMPLIFY Central resources from Bitbucket resources

AMPLIFY CENTRAL EXTENSION FOR BITBUCKET COMMANDS:
  config  Manage Bitbucket Extension Configuration
  resources  Generate resources from Bitbucket
```

# Commands reference:

## CONFIG

The `config` command is utilized to configure the extension prior to generating resources. There are two config sub-commands; `list` and `set`.

```bash
$ amplify central bitbucket-extension config -h
USAGE: amplify central bitbucket-extension config <command> [options]

Manage Bitbucket Extension Configuration

CONFIG COMMANDS:
  list  View AMPLIFY Central bitbucket-extension configuration
  set  Set AMPLIFY Central bitbucket-extension configuration
```

### config examples:

```bash
# set output dir for the generated resources:
$ amplify central bitbucket-extension config set --output-dir=<directory>
# view config:
$ amplify central bitbucket-extension config list
# view list of available options
$ amplify central bitbucket-extension config set -h

SET OPTIONS:
  --access-token=<value>  Required*: Bitbucket personal access token for an alternate to username/app-password.
  --app-password=<value>  Required*: Bitbucket app password, used with username
  --username=<value>  Required*: Bitbucket username, used with app-password
  --branch=<value>  Required: Repository branch to search
  --environment-name=<value>  Required: Set environment name to create
  --repo=<value>  Required: Repository to search
  --workspace=<value>  Required: Repository workspace. Often your username for v2 and your project name for v1
  --api-version=<value>  Bitbucket API version ('v1' or 'v2'), defaults to 'v2'
  --base-url=<value>  Bitbucket host, defaults to https://api.bitbucket.org/2.0 for api-version v2. Required for v1
  --icon=<value>  Set absolute path for custom icon
  --output-dir=<value>  Set absolute path for output directory
  --path=<value>  Path in repo to search for specs. Use a spec's absolute path to import one. Defaults to /
  
```

---

## RESOURCES

The `resources` command is utilized to generate github resources for Central. There is one resources sub-command: `generate`

```bash
$ amplify central bitbucket-extension resources -h

USAGE: amplify central bitbucket-extension resources <command> [options]

Generate resources from Bitbucket

RESOURCES COMMANDS:
  generate
```

### resources examples:

```bash
$ amplify central bitbucket-extension resources generate
```

### Generated Files

The generate command will create AMPLIFY Central resource files. These files will generated into either `./resources` or the directory you configured with the `--output-dir` configuration setting.

After generating these files you can modify and upload them to AMPLIFY Central with the `amplify central create -f=<file>` command. You'll want be sure to upload any Environment files before other generate resources.

```bash
$ amplify central create -h
USAGE: amplify central create <command> [options]

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
amplify central create -f=~/Desktop/Environment.yaml
# Upload the APIService, APIServiceRevision, APIServiceInstance, and ConsumerInstance
amplify central create -f=~/Desktop/APIService-swagger-petstore.yaml
```

---

## Author

Axway <support@axway.com> https://axway.com

---

## License

Copyright 2020 Axway

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
