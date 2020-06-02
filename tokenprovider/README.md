# Welcome to token provider service


To deploy the service:

### Setup acs CLI

```
npm install -g acs
acs login
```

Create ACS App if not already

```
acs new tokenprovider --force
```

### Config the port

```
acs config --set PORT=8080 tokenprovider
```

### Build your tokenprovider image

```
docker build --tag tokenprovider ./
```


### Publish

```
acs publish tokenprovider --delete_oldest --force --image tokenprovider --app_version 0.1
```

### Config oAuth callback

The callback for oAuth needs to be configured now that you have a URL for your service. To do that run the following command which will also ask to restart the service - type yes:

```
acs config --set CALLBACK_URI={HOST ENDPOINT}/auth/callback
```

### Init the access/refresh tokens

- Navigate to {HOST ENDPOINT}/console/project/credentials and login with username: admin, password: {apikey from default.js}
- Click Authorize/Reauthroize
- Login with AxwayID

### Test

```
curl -H 'APIKey: Oz45KL9MNixSlgGz7/lkVmUVkHeFPk0B' {HOST ENDPOINT}/api/token
```

### Monitor

```
while 1=1; do clear && acs list tokenprovider; sleep 2; done
```

```
acs logcat tokenprovider
```

### Shutdown
acs unpublish tokenprovider