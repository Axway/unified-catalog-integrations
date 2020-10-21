# Dev setup

### Pre-Reqs

1. Have the amplify and amplify central cli already installed

```
npm install -g @axway/amplify-cli
amplify pm install @axway/amplify-central-cli
```

2. Link your new/current extension to the central CLI

```
amplify central config set extensions.<extension name> <path to the directory of your extension>
```

## Adding/Removing config options

1. Under src/commands/config/set.ts add/remove any config options you want.

2. Under types.ts add/remove the corresponding config options to the ConfigKeys object. The formatting really seems to matter here.

Example: adding 'mySetting'

```
// set.ts
--my-setting [value]": "my setting"

// types.ts
MY_SETTING = "mySetting"
```

## Modifying the Generate method

Under src/commands/resources/generate.ts is where you add/shoehorn the generate logic. We currently have this flow.

1. Get/validate the config

2. Fetch the apis from service

3. Create the files
Give that array of properties to createResources and it will generate the yamls

## Debugging

There are several ways you can debug a new/current extension. Several extensions come with a launch file you can use to debug in vscode. Alternatively, you can use the blow method:

1. Add your breakpoints with 'debugger' statements

2. Modify the amplify cli

```
// get path to cli
which amplify

// add debug setting to node
vim <path to cli>
#!/usr/bin/env node --inspect-brk
```

3. Open this uri in chrome

```chrome://inspect```

4. click 'Open dedicated DevTools for Node'

5. Run the CLI command you're debugging

```amplify central azure-extension config list```

## Example commands

1. Azure list config ```amplify central azure-extension config list```

2. Azure set tenantid ```amplify central azure-extension config set --tenant-id=<tenant>```

3. Azure generate resources ```amplify central azure-extension resources generate```


## Convenience commands (unix)

```bash

# Add all extensions at once
for i in `ls -1 | grep \-extension`; do name=`echo $i | awk -F- '{print $1}'`; amplify central config set extensions.$name `pwd`/$i; done

# Build all extensions
for i in `ls -1 | grep \-extension`; do cd $i; yarn && yarn build; cd ..; done

# Run all extensions
for i in `ls -1 | grep \-extension`; do amplify central $i resources generate; done

# Run all tests
for i in `ls -1 | grep \-extension`; do cd $i; yarn test:nc; cd ..; done

```