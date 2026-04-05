#!/usr/bin/env bash
# Deploy r2-media-worker to Cloudflare
# Run once: npx wrangler login (opens browser)
# Then: bash deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Deploying r2-media-worker..."
npx wrangler deploy

echo ""
echo "==> Setting UPLOAD_TOKEN secret..."
echo "    If this is the first deploy, you need to set the upload token:"
echo ""
echo "    Generate a token:"
echo "      openssl rand -hex 32"
echo ""
echo "    Set it as a secret:"
echo "      cd $(pwd) && npx wrangler secret put UPLOAD_TOKEN"
echo ""
echo "    Then save the same token to ~/.config/cf-upload.env:"
echo "      echo 'UPLOAD_TOKEN=<your-token>' > ~/.config/cf-upload.env"
echo "      echo 'WORKER_URL=https://r2-media-worker.gautambharg.workers.dev' >> ~/.config/cf-upload.env"
echo ""
echo "==> Done. Worker URL: https://r2-media-worker.gautambharg.workers.dev"
