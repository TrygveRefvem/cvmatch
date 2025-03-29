# CVMatch Deployment Guide

This document outlines the steps to deploy the CVMatch application to Azure using Docker.

## Prerequisites

- Docker installed locally
- Azure CLI installed and logged in (`az login`)
- Appropriate Azure permissions to create and manage resources

## Environment Variables

The application requires the following environment variables:

- `OPENAI_API_KEY` (required): Your OpenAI API key
- `OPENAI_API_BASE_URL` (optional): Custom OpenAI API base URL

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

1. Ensure no local development servers are running that might cause conflicts:

```bash
# Check for running Node.js processes
ps aux | grep 'next' | grep -v grep

# Kill any processes still using ports 3000-3006
lsof -i :3000-3006 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

2. Set your environment variables:

```bash
export OPENAI_API_KEY=your_api_key_here
export OPENAI_API_BASE_URL=your_api_url_here  # Optional
```

3. Run the deployment script:

```bash
./deploy.sh
```

This script will:
- Build the Docker image locally
- Create an Azure Container Registry if it doesn't exist (with a unique name)
- Push the image to the registry
- Configure the web app to use the container
- Set up environment variables in Azure
- Restart the web app

### Option 2: Manual Deployment

If you prefer to deploy manually, follow these steps:

1. Build the Docker image:

```bash
docker build -t cvmatch:latest .
```

2. Create a unique Azure Container Registry name (ACR names must be globally unique):

```bash
REGISTRY_NAME="cvmatchregistry$(date +%m%d)"
az acr create --resource-group cvmatch-v2-rg --name $REGISTRY_NAME --sku Basic
```

3. Log in to the registry:

```bash
az acr login --name $REGISTRY_NAME
```

4. Tag and push the image:

```bash
docker tag cvmatch:latest $REGISTRY_NAME.azurecr.io/cvmatch:latest
docker push $REGISTRY_NAME.azurecr.io/cvmatch:latest
```

5. Configure the web app:

```bash
# Set up the container
az webapp config container set \
  --name cvmatch-v2 \
  --resource-group cvmatch-v2-rg \
  --docker-custom-image-name $REGISTRY_NAME.azurecr.io/cvmatch:latest \
  --docker-registry-server-url https://$REGISTRY_NAME.azurecr.io \
  --docker-registry-server-user $(az acr credential show --name $REGISTRY_NAME --query username -o tsv) \
  --docker-registry-server-password $(az acr credential show --name $REGISTRY_NAME --query "passwords[0].value" -o tsv)

# Set environment variables
az webapp config appsettings set \
  --name cvmatch-v2 \
  --resource-group cvmatch-v2-rg \
  --settings \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
  OPENAI_API_KEY="your_api_key_here" \
  OPENAI_API_BASE_URL="your_api_url_here"  # Optional
```

6. Restart the web app:

```bash
az webapp restart --name cvmatch-v2 --resource-group cvmatch-v2-rg
```

## Troubleshooting

### Viewing Logs

To view the application logs, use the following command:

```bash
az webapp log tail --name cvmatch-v2 --resource-group cvmatch-v2-rg
```

### Common Issues

1. **Container fails to start**: Check if all environment variables are set correctly in the Azure Web App configuration.

2. **Permission issues**: Ensure the Azure service principal has access to the container registry.

3. **Memory issues**: Try increasing the memory allocation in the Azure App Service plan.

4. **Registry name already in use**: If you get an error about the registry name being already in use, try a different name in the script.

5. **Port conflicts locally**: The local development server uses ports 3000-3006. If you see port conflicts, kill any leftover processes using the ports.

6. **Next.js configuration errors**: Ensure `serverExternalPackages` is correctly placed at the top level of the configuration object. 