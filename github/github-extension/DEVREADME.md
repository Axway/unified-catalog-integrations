# Github Extension

## Disclaimer

This extension is example code and comes with no guarantee of support or maintenance. 

## Setup

You'll need an access token before you can fetch your repo contents

1. Navigate to your [github token settings](https://github.com/settings/tokens)
2. Generate a new token that has access for `read:packages`, `repo`
3. You'll also need to note your desired repo, username, and branch.

## Debugging
The extension comes with 2 VSCode launch configurations [Debug GitHub Tests, Debug GitHub Generate]. You may need to change the `cwd` and `program` properties to work with your system.

## Installing/Building/Testing/Extending

**Install Dependencies**

``yarn``

**Build**

``yarn build``

**Test**

``yarn test``

**Extending**

The extension src framework/commands is written in TS but the code responsible for fetching and generating the resource files are written in JS inside `service.js`. You can modify the code at-will and build with `yarn build`.