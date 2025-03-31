#!/bin/bash

# Exit on error
set -e

echo "Starting deployment process..."

# Clean up any existing processes
echo "Cleaning up existing processes..."
ps aux | grep 'next dev' | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Build the Docker image
echo "Building Docker image..."
docker build -t ${ACR_NAME}.azurecr.io/${APP_NAME}:latest .

# Login to Azure Container Registry
echo "Logging in to Azure Container Registry..."
az acr login --name ${ACR_NAME}

# Push the image
echo "Pushing image to Azure Container Registry..."
docker push ${ACR_NAME}.azurecr.io/${APP_NAME}:latest

# Update web app configuration
echo "Updating web app configuration..."
az webapp config container set \
  --name ${APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --docker-custom-image-name ${ACR_NAME}.azurecr.io/${APP_NAME}:latest \
  --docker-registry-server-url https://${ACR_NAME}.azurecr.io \
  --docker-registry-server-user ${ACR_USERNAME} \
  --docker-registry-server-password ${ACR_PASSWORD}

# Set environment variables
echo "Setting environment variables..."
az webapp config appsettings set \
  --resource-group ${RESOURCE_GROUP} \
  --name ${APP_NAME} \
  --settings \
    WEBSITES_PORT=3000 \
    OPENAI_API_KEY=${OPENAI_API_KEY} \
    NODE_ENV=production \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true

# Restart the web app
echo "Restarting web app..."
az webapp restart --name ${APP_NAME} --resource-group ${RESOURCE_GROUP}

echo "Deployment completed. Waiting for app to start..."
sleep 30

# Check the logs
echo "Checking logs..."
az webapp log tail --name ${APP_NAME} --resource-group ${RESOURCE_GROUP} 