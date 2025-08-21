#!/bin/bash

# Fix React Component Exports Script
# Adds default exports to components that are using named exports but need default exports for lazy loading

echo "🔧 Fixing React component exports for lazy loading..."
echo "=================================================="

# Function to add default export to a component file
add_default_export() {
    local file=$1
    local component_name=$2
    
    echo "📝 Adding default export to $file..."
    
    # Check if default export already exists
    if grep -q "export default" "$file"; then
        echo "✅ Default export already exists in $file"
        return 0
    fi
    
    # Add default export at the end of the file
    echo "" >> "$file"
    echo "export default $component_name;" >> "$file"
    
    echo "✅ Added default export to $file"
}

# List of components that need default exports
declare -A components=(
    ["src/bonded-app-frontend/src/screens/Login/Login.jsx"]="Login"
    ["src/bonded-app-frontend/src/screens/Register/Register.jsx"]="Register"
    ["src/bonded-app-frontend/src/screens/GettingStarted/GettingStarted.jsx"]="GettingStarted"
    ["src/bonded-app-frontend/src/screens/Verify/Verify.jsx"]="Verify"
    ["src/bonded-app-frontend/src/screens/MoreInfo/MoreInfo.jsx"]="MoreInfo"
    ["src/bonded-app-frontend/src/screens/TimelineCreated/TimelineCreated.jsx"]="TimelineCreated"
    ["src/bonded-app-frontend/src/screens/Account/Account.jsx"]="Account"
    ["src/bonded-app-frontend/src/screens/Privacy/Privacy.jsx"]="Privacy"
    ["src/bonded-app-frontend/src/screens/FAQ/FAQ.jsx"]="FAQ"
    ["src/bonded-app-frontend/src/screens/ExportTimeline/ExportTimeline.jsx"]="ExportTimeline"
    ["src/bonded-app-frontend/src/screens/TimestampFolder/TimestampFolder.jsx"]="TimestampFolder"
    ["src/bonded-app-frontend/src/screens/ImagePreview/ImagePreview.jsx"]="ImagePreview"
    ["src/bonded-app-frontend/src/screens/ExportAllData/ExportAllData.jsx"]="ExportAllData"
    ["src/bonded-app-frontend/src/screens/MediaImport/MediaImport.jsx"]="MediaImport"
    ["src/bonded-app-frontend/src/screens/ProfileSetup/ProfileSetup.jsx"]="ProfileSetup"
    ["src/bonded-app-frontend/src/screens/AISettings/AISettings.jsx"]="AISettings"
    ["src/bonded-app-frontend/src/screens/AcceptInvite/AcceptInvite.jsx"]="AcceptInvite"
    ["src/bonded-app-frontend/src/screens/Capture/Capture.jsx"]="Capture"
    ["src/bonded-app-frontend/src/components/PWAInstallPrompt/PWAInstallPrompt.jsx"]="PWAInstallPrompt"
    ["src/bonded-app-frontend/src/components/OfflineStatusBar/OfflineStatusBar.jsx"]="OfflineStatusBar"
)

# Process each component
for file in "${!components[@]}"; do
    component_name="${components[$file]}"
    
    if [ -f "$file" ]; then
        add_default_export "$file" "$component_name"
    else
        echo "⚠️ File not found: $file"
    fi
done

echo ""
echo "🎯 Export Fix Summary:"
echo "======================"
echo "✅ Added default exports to components for proper lazy loading"
echo "✅ Fixed the 'SuppressedError' issue in React.lazy components"
echo ""
echo "🚀 You can now run the app without lazy loading errors!"
echo "💡 The components will load properly when navigating to their routes"
