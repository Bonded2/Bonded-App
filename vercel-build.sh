 #!/bin/bash
echo "🚀 Starting Vercel build process for bonded-app"

# Install dependencies in the frontend directory
echo "📦 Installing frontend dependencies..."
cd src/bonded-app-frontend
npm install

# Build the frontend
echo "🏗️ Building frontend..."
npm run build

echo "✅ Build completed successfully!"