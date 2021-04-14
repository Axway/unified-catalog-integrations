#!/usr/bin/env bash
# !!! IMPORTANT !!!
# Script will create the API Server resources and its related Catalog Item based on resources in ./resources folder.

#auth type can be web or DOSA
AUTH_TYPE="DOSA"
#primary key location for DOSA
PK_FILE_LOCATION="./private_key.pem"
# Resource files path
RESOURCES_PATH="resources/petstore-sample"
#environment name where the resources are deployed
CENTRAL_ENV_NAME="petstore"
#environment type for central.
CENTRAL_ENV_TYPE="production"

#parse the parameters
for i in "$@"
do
case $i in
    -a=*|--auth-type=*)
    AUTH_TYPE="${i#*=}"
    shift # past argument=value
    ;;
    -cen=*|--central-env-name=*)
    CENTRAL_ENV_NAME="${i#*=}"
    shift # past argument=value
    ;;
    -cet=*|--central-env-type=*)
    CENTRAL_ENV_TYPE="${i#*=}"
    shift # past argument=value
    ;;
    -pk=*|--primary-key=*)
    PK_FILE_LOCATION="${i#*=}"
    shift # past argument=value
    ;;
    -rp=*|--resources-path=*)
    RESOURCES_PATH="${i#*=}"
    shift # past argument=value
    ;;
    -did=*|--dosa-id=*)
    DOSA_CLIENT_ID="${i#*=}"
    shift # past argument=value
    ;;
    *)
          # unknown option
    ;;
esac
done
# let's avoid using unitialized variables
TOKEN=""
TENANT_ID=""
# full path of the image used for publishing the catalog Item.
IMAGE_LOCATION_FILE_PATH="$RESOURCES_PATH/$IMAGE_LOCATION_FILE_NAME"
# full path of the documentation of catalog Item published.
CATALOG_DOCUMENTAION_FILE_PATH="$RESOURCES_PATH/$CATALOG_DOCUMENTATION_FILE_NAME"
set -u
echo "[INFO] Running with AUTH_TYPE=$AUTH_TYPE . "
echo "[INFO] Running with CENTRAL_ENV_NAME=$CENTRAL_ENV_NAME . "
echo "[INFO] Running with CENTRAL_ENV_TYPE=$CENTRAL_ENV_TYPE . "
echo "[INFO] Running with DOSA_CLIENT_ID=$DOSA_CLIENT_ID . "
echo "[INFO] Running with RESOURCES_PATH=$RESOURCES_PATH . "
echo "[INFO] Running with CATALOG_DOCUMENTAION_FILE_PATH=$CATALOG_DOCUMENTAION_FILE_PATH . "
echo "[INFO] Running with IMAGE_LOCATION_FILE_PATH=$IMAGE_LOCATION_FILE_PATH . "
echo "[INFO] Running with VERSION=$VERSION"

if [[ ${AUTH_TYPE} != "DOSA" ]]; then
	echo "Authenticating using browser"
	axway auth login --client-id apicentral
	#login and get token
	TOKEN=$(axway auth list --json | jq -r '.[0].tokens.access_token')
	TENANT_ID=$(axway auth list --json | jq -r '.[0].org.id')
else
	echo "Authenticating using DOSA and private key from: ${PK_FILE_LOCATION}"
	authResult=$(axway auth login --json --secret-file ${PK_FILE_LOCATION} --client-id $DOSA_CLIENT_ID) ||
        { echo "[ERROR] failed to login with cli" && exit 1; }
	TOKEN=$(echo $authResult | jq -r '.tokens.access_token')
	TENANT_ID=$(echo $authResult | jq -r '.[0].org.id')
	axway central config set --client-id=$DOSA_CLIENT_ID
fi

echo "[INFO] Using tenant id: $TENANT_ID"

# base64 encoded image to be added.
export SERVICE_IMAGE=$(cat ${IMAGE_LOCATION_FILE_PATH} | base64 -w 0 )

# create a tmp directory for substituted environment variables.
rm -rf .tmp
mkdir -p .tmp

# Get the swagger specification from the URL to be posted with revision.
curl --retry 60 --retry-delay 1 --retry-max-time 60 \
        -H "Accept: application/json" \
        -L "${SPECIFICATION_URL}" | base64 -w 0 > .tmp/encoded_specification.txt
#replace the env varibales in the api service
envsubst < ./$RESOURCES_PATH/apiservice.yaml > .tmp/apiservice.yaml
echo "[INFO] Applying api service defined in ./.tmp/apiservice.yaml"
axway central apply -f .tmp/apiservice.yaml || { echo "[ERROR] Create/update apiservice" && exit 1; }
envsubst < ./$RESOURCES_PATH/apiservicerevision.yaml > .tmp/apiservicerevision.yaml
echo "[INFO] Creating api service revision defined in ./.tmp/apiservicerevision.yaml"
# Since envsubst has a limit on the values, sed is used here as specification might be a very large file. 
sed -f <(printf '%s\n' "s,SPECIFICATION_BASE64,$(cat .tmp/encoded_specification.txt),g") .tmp/apiservicerevision.yaml > .tmp/apiservicerevision_spec.yaml
axway central apply -f .tmp/apiservicerevision_spec.yaml || { echo "[ERROR] Create/update api service revision" && exit 1; }
envsubst < ./$RESOURCES_PATH/apiserviceinstance.yaml > .tmp/apiserviceinstance.yaml
echo "[INFO] Creating api service instance defined in ./.tmp/apiserviceinstance.yaml"
axway central apply -f .tmp/apiserviceinstance.yaml || { echo "[ERROR] Create/update apiserviceinstance" && exit 1; }
envsubst < ./$RESOURCES_PATH/consumerinstance.yaml > .tmp/consumerinstance.yaml

if [[ -f "./$RESOURCES_PATH/$CATALOG_DOCUMENTATION_FILE_NAME" ]]; then
    echo "Injecting catalogDocumentation.md content"
ed -s .tmp/consumerinstance.yaml <<END_ED
/documentation/r !sed 's/^/    /' ./$RESOURCES_PATH/catalogDocumentation.md
wq
END_ED
fi

echo "[INFO] Creating consumerInstance defined in ./.tmp/consumerinstance.yaml"
axway central apply -f .tmp/consumerinstance.yaml || { echo "[ERROR] Create/update consumerinstance" && exit 1; }
#remove the tmp folder created.
rm -rf .tmp