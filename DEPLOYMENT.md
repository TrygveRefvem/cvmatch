# Deployment Guide for CV Match

This document outlines the successful deployment process for the CV Match application to Azure Web App.

## Prerequisites

- Azure CLI installed
- Docker installed
- Access to Azure Container Registry (ACR)
- OpenAI API key

## Deployment Steps

### 1. Build and Push Docker Image

```bash
# Build multi-architecture Docker image
docker buildx build --platform linux/amd64,linux/arm64 -t cvmatchregistry0327.azurecr.io/cvmatch:latest --push .
```

### 2. Configure Azure Web App

The following environment variables need to be set in the Azure Web App configuration:

```bash
# Set environment variables
az webapp config appsettings set --name cvmatch-v2 --resource-group cvmatch-v2-rg --settings \
  OPENAI_API_KEY="your-openai-api-key" \
  OPENAI_API_BASE_URL="https://api.openai.com/v1" \
  NEXT_PUBLIC_API_URL="https://cvmatch-v2.azurewebsites.net" \
  NODE_ENV="production" \
  WEBSITES_PORT="3000" \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE="false"
```

### 3. Configure Container Registry Access

```bash
# Set container registry credentials
az webapp config container set --name cvmatch-v2 --resource-group cvmatch-v2-rg \
  --container-registry-url https://cvmatchregistry0327.azurecr.io \
  --container-image-name cvmatchregistry0327.azurecr.io/cvmatch:latest \
  --container-registry-user cvmatchregistry0327 \
  --container-registry-password "your-acr-password"
```

### 4. Restart Web App

```bash
# Restart the web app to apply changes
az webapp restart --name cvmatch-v2 --resource-group cvmatch-v2-rg
```

## Important Notes

### OpenAI API Configuration

1. The application uses OpenAI's API directly (not Azure OpenAI)
2. Required environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OPENAI_API_BASE_URL`: Set to "https://api.openai.com/v1"

### Container Configuration

1. The application runs in a multi-architecture Docker container
2. The container exposes port 3000
3. The web app is configured to use this port via `WEBSITES_PORT=3000`

### Troubleshooting

If you encounter issues:

1. Check the web app logs:
   ```bash
   az webapp log download --name cvmatch-v2 --resource-group cvmatch-v2-rg
   ```

2. Verify environment variables:
   ```bash
   az webapp config appsettings list --name cvmatch-v2 --resource-group cvmatch-v2-rg
   ```

3. Ensure the container registry credentials are correct:
   ```bash
   az webapp config container show --name cvmatch-v2 --resource-group cvmatch-v2-rg
   ```

## Security Considerations

1. The OpenAI API key is stored securely in Azure Web App configuration
2. Container registry credentials are managed through Azure Web App
3. The application runs in a production environment with appropriate security settings

## Monitoring

Monitor the application's health through:
1. Azure Portal > App Service > Logs
2. Application Insights (if configured)
3. Container logs via Azure CLI 