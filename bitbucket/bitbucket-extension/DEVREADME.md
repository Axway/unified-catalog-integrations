# Bitbucket Extension

## Disclaimer

This extension is example code and comes with no guarantee of support or maintenance. 

## Setup

**For v1** (not offered on Bitbucket cloud now) you'll need to run a container somewhere that has the older bitbucket-server. Example:

```
docker run -v bitbucketVolume:/var/atlassian/application-data/bitbucket --name="bitbucket" -d -p 7990:7990 -p 7999:7999 atlassian/bitbucket-server:6.10.0-ubuntu
```

1. Navigate the to server page: http://127.0.0.1:7990/
2. Setup an account, and create your project with a repo in it
3. You'll need to create a [personal access token](https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html).

**For v2**
1. Create an account for bitbucket server cloud bitbucket.org
2. Create a workspace/project with a repo inside
3. You'll need to create an [App Password](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/)


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