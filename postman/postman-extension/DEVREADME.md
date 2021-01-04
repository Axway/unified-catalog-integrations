# Postman Extension

## Disclaimer

This extension is example code and comes with no guarantee of support or maintenance. 

## Setup

amplify central postman-extension config set -h

## Debugging

1. It is recommended that you use VSCode to debug. After you ```yarn && yarn build``` you can place breakpoints in the code. Then from the VSCode command bar run ```Debug: Create Javascript Debug Terminal```
2. You can then run the ```generate resources``` command and VScode will let you repl/step/etc

## Installing/Building/Testing/Extending

**Install Dependencies**

``yarn``

**Build**

``yarn build``

**Test**

``yarn test``

**Extending**

The extension src framework/commands is written in TS. The code responsible for fetching and generating the resource files inside `service.js`. You can modify the code at-will and build with `yarn build`.