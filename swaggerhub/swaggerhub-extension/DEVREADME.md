# Swaggerhub Extension

## Disclaimer

This extension is example code and comes with no guarantee of support or maintenance. 

## Setup

All you need for this swagger hub extension is your owner and the root url. Ex: https://api.swaggerhub.com/apis/

## Debugging

The extension comes with 2 example VSCode launch configurations [Debug Swaggerhub Tests, Debug Swaggerhub Generate].

## Installing/Building/Testing/Extending

**Install Dependencies**

``yarn``

**Build**

``yarn build``

**Test**

``yarn test``

**Extending**

The extension src framework/commands is written in TS but the code responsible for fetching and generating the resource files are written in JS inside `service.js`. You can modify the code at-will and build with `yarn build`.