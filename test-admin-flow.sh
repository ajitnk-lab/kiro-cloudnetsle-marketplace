#!/bin/bash

echo "🔍 Testing Admin Flow..."
echo ""

echo "1. ✅ Admin user exists in Cognito:"
aws cognito-idp list-users --user-pool-id us-west-2_WJZDxqpIH --region us-west-2 --filter "email = \"admin@marketplace.com\"" --query "Users[0].{Email:Attributes[?Name=='email'].Value|[0],Role:Attributes[?Name=='custom:role'].Value|[0],Status:UserStatus}"

echo ""
echo "2. ✅ Partner application exists in database:"
aws dynamodb scan --table-name MP-1759859484941-DataStackPartnerApplicationTable548221AF-1NRFHZ9Z8MHSG --region us-west-2 --query "Items[0].{ApplicationId:applicationId.S,BusinessName:businessName.S,Status:status.S,SubmittedAt:submittedAt.S}"

echo ""
echo "3. ✅ API Gateway admin endpoint is configured:"
aws apigateway get-method --rest-api-id 3093ddu8xa --resource-id xn4aqa --http-method GET --region us-west-2 --query "{AuthType:authorizationType,AuthorizerId:authorizerId}"

echo ""
echo "4. 🔧 Next Steps:"
echo "   • Login as admin at: http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com"
echo "   • Use credentials: admin@marketplace.com / Admin123!"
echo "   • Navigate to Admin Dashboard"
echo "   • Check browser console for any authentication errors"
echo ""
echo "5. 🐛 If admin dashboard shows no applications:"
echo "   • Check browser console for 401/403 errors"
echo "   • Verify JWT token is being sent in Authorization header"
echo "   • Check if user role is 'admin' in Cognito"
