#!/bin/bash

# Script to replace all alert() calls with custom popup

cd packages/frontend/src

# Update SolutionDetailPage
sed -i 's/const { user } = useAuth()/const { user } = useAuth()\n  const { popup, showPopup, closePopup } = usePopup()/' pages/SolutionDetailPage.tsx
sed -i "s/alert('Payment initiation failed. Please try again.')/showPopup('Payment initiation failed. Please try again.', 'error')/g" pages/SolutionDetailPage.tsx

# Update SimpleAdmin
sed -i '1i import { CustomPopup, usePopup } from "../components/CustomPopup"' pages/SimpleAdmin.tsx
sed -i 's/export function SimpleAdmin() {/export function SimpleAdmin() {\n  const { popup, showPopup, closePopup } = usePopup()/' pages/SimpleAdmin.tsx
sed -i "s/alert('Enter access token first')/showPopup('Enter access token first', 'info')/g" pages/SimpleAdmin.tsx
sed -i "s/alert(\`Error: \${response.status} - \${JSON.stringify(data)}\`)/showPopup(\`Error: \${response.status} - \${JSON.stringify(data)}\`, 'error')/g" pages/SimpleAdmin.tsx
sed -i "s/alert(\`Network error: \${error instanceof Error ? error.message : 'Unknown error'}\`)/showPopup(\`Network error: \${error instanceof Error ? error.message : 'Unknown error'}\`, 'error')/g" pages/SimpleAdmin.tsx

echo "Alert replacements completed!"
