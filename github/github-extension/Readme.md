# @axway/amplify-central-github-extension

AMPLIFY Central CLI extension for downloading and creating AMPLIFY Central resources for GitHub.

**For more documentation and examples please visit [Unified Catalog integrations](https://github.com/Axway/unified-catalog-integrations).**

# Disclaimer

This extension is example code and comes with no guarantee of support or maintenance.

# PreReqs

This assumes you already have npm installed and have an github account setup. Visit [NodeJS](https://nodejs.org/) to learn how to install NodeJS. If you need help with setting up your github account, you can view the Setup section of the local [DEVREADME.MD](DEVREADME.md)

# Installation

Assuming you are familiar with [Node.js](https://nodejs.org) and [npm](https://npmjs.com), you should first install the [Axway AMPLIFY CLI](https://www.npmjs.com/package/@axway/amplify-cli), which will give you connectivity to the [Axway AMPLIFY Platform](https://www.axway.com/en/products/amplify). Note that you must first have an account on [https://platform.axway.com](https://platform.axway.com/), and be provisioned in AMPLIFY Central:

```bash
$ [sudo] npm install -g @axway/amplify-cli
```

Use the AMPLIFY package manager command to install the AMPLIFY Central CLI:

```bash
$ amplify pm install @axway/amplify-central-cli@0.1.3-dev.10
```

You can then install the @axway/amplify-central-github-extension:

```bash
$ npm install @axway/amplify-central-github-extension
$ amplify central config set extensions.github <path to where you installed module>
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
$ amplify central github-extension -h
USAGE: amplify central github-extension <command> [options]

Create AMPLIFY Central resources from GitHub API Management APIs

AMPLIFY CENTRAL EXTENSION FOR GITHUB API MANAGEMENT COMMANDS:
  config  Manage GitHub Extension Configuration
  resources  Generate resources from GitHub API Management APIs
```

# Commands reference:

## CONFIG

The `config` command is utilized to configure the extension prior to generating resources. There are two config sub-commands; `list` and `set`.

```bash
$ amplify central github-extension config -h
USAGE: amplify central github-extension config <command> [options]

Manage GitHub Extension Configuration

CONFIG COMMANDS:
  list  View AMPLIFY Central github-extension configuration
  set  Set AMPLIFY Central github-extension configuration
```

### config examples:

```bash
# set output dir for the generated resources:
$ amplify central github-extension config set --output-dir=<directory>
# view config:
$ amplify central github-extension config list
# view list of available options
$ amplify central github-extension config set -h

SET OPTIONS:
  --branch=<value>  Required: repository branch to search in
  --environment-name=<value>  Required: Set environment name to create
  --git-token=<value>  Required: github access_token
  --git-user-name=<value>  Required: github username
  --icon=<value>  Set absolute path for custom icon
  --output-dir=<value>  Set absolute path for output directory
  --repo=<value>  Required: repository to search in
```

---

## RESOURCES

The `resources` command is utilized to generate github resources for Central. There is one resources sub-command: `generate`

```bash
$ amplify central github-extension resources -h

USAGE: amplify central github-extension resources <command> [options]

Generate resources from GitHub API Management APIs

RESOURCES COMMANDS:
  generate
```

### resources examples:

```bash
$ amplify central github-extension resources generate
```

### Generated Files

The generate command will create AMPLIFY Central resource files for your configured GitHub instance. These files will generated into either `./resources` or the directory you configured with the `--output-dir` configuration setting.

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

## License

This code is proprietary, closed source software licensed to you by Axway. All Rights Reserved. You may not modify Axway’s code without express written permission of Axway. You are licensed to use and distribute your services developed with the use of this software and dependencies, including distributing reasonable and appropriate portions of the Axway code and dependencies. Except as set forth above, this code MUST not be copied or otherwise redistributed without express written permission of Axway. This module is licensed as part of the Axway Platform and governed under the terms of the Axway license agreement (General Conditions) located here: [https://support.axway.com/en/auth/general-conditions](https://support.axway.com/en/auth/general-conditions); EXCEPT THAT IF YOU RECEIVED A FREE SUBSCRIPTION, LICENSE, OR SUPPORT SUBSCRIPTION FOR THIS CODE, NOTWITHSTANDING THE LANGUAGE OF THE GENERAL CONDITIONS, AXWAY HEREBY DISCLAIMS ALL SUPPORT AND MAINTENANCE OBLIGATIONS, AS WELL AS ALL EXPRESS AND IMPLIED WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED INFRINGEMENT WARRANTIES, WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, AND YOU ACCEPT THE PRODUCT AS-IS AND WITH ALL FAULTS, SOLELY AT YOUR OWN RISK. Your right to use this software is strictly limited to the term (if any) of the license or subscription originally granted to you.
