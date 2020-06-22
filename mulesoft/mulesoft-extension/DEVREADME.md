# Mulesoft Extension

## Disclaimer

This extension is example code and comes with no guarantee of support or maintenance. 

## Setup

1. Signup for a mulesoft account
2. Note your username, password, and master org id (guid format)

## Debugging
The extension comes with 2 VSCode launch configurations [Debug Mulesoft Tests, Debug Mulesoft Generate]. You may need to change the `cwd` and `program` properties to work with your system.

## Installing/Building/Testing/Extending

**Install Dependencies**

``yarn``

**Build**

``yarn build``

**Test**

``yarn test``

**Extending**

The extension src framework/commands is written in TS but the code responsible for fetching and generating the resource files are written in JS inside `service.js`. You can modify the code at-will and build with `yarn build`.