#!/bin/bash
set -e

# Configuration
APP_NAME="cvmatch-v2"
RESOURCE_GROUP="cvmatch-v2-rg"
REGISTRY_NAME="cvmatchregistry$(date +%m%d)"
IMAGE_NAME="cvmatch"
IMAGE_TAG=$(date +%Y%m%d%H%M%S)

# Check for required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: OPENAI_API_KEY environment variable is not set."
  echo "Please set it before running this script: export OPENAI_API_KEY=your_api_key"
  exit 1
fi

# Optional environment variables
OPENAI_API_BASE_URL=${OPENAI_API_BASE_URL:-""}

echo "Building Docker image..."
docker build -t $IMAGE_NAME:$IMAGE_TAG .

# Create Azure Container Registry if it doesn't exist
echo "Checking if Container Registry exists..."
az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP &>/dev/null || {
  echo "Creating Azure Container Registry..."
  az acr create --resource-group $RESOURCE_GROUP --name $REGISTRY_NAME --sku Basic
}

# Log in to Azure Container Registry
echo "Logging in to Azure Container Registry..."
az acr login --name $REGISTRY_NAME

# Tag and push the image
REGISTRY_URL="$REGISTRY_NAME.azurecr.io"
FULL_IMAGE_NAME="$REGISTRY_URL/$IMAGE_NAME:$IMAGE_TAG"
echo "Tagging and pushing image to $FULL_IMAGE_NAME..."
docker tag $IMAGE_NAME:$IMAGE_TAG $FULL_IMAGE_NAME
docker push $FULL_IMAGE_NAME

# Update the Azure Web App to use the new image
echo "Updating Azure Web App to use the new image..."
az webapp config container set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name $FULL_IMAGE_NAME \
  --docker-registry-server-url https://$REGISTRY_URL \
  --docker-registry-server-user $(az acr credential show --name $REGISTRY_NAME --query username -o tsv) \
  --docker-registry-server-password $(az acr credential show --name $REGISTRY_NAME --query "passwords[0].value" -o tsv)

# Configure environment variables for the web app
echo "Setting environment variables for the web app..."
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  $([ -n "$OPENAI_API_BASE_URL" ] && echo "OPENAI_API_BASE_URL=$OPENAI_API_BASE_URL")

# Restart the web app to apply changes
echo "Restarting the web app..."
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

echo "Deployment completed successfully!" 