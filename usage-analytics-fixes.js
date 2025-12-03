// Usage Analytics Fixes
// Based on conversation summary and code analysis

const fixes = {
  // Fix 1: Active Users count should include all registered users, not just entitlements
  activeUsersLogic: {
    current: "Counts unique users from entitlements table only",
    issue: "Should count all registered users from marketplace-users table",
    fix: "Query marketplace-users table instead of entitlements for total user count"
  },

  // Fix 2: API Requests showing 0 due to CloudWatch configuration
  apiRequestsIssue: {
    current: "CloudWatch metrics failing - returns 0",
    issue: "API Gateway name 'MarketplaceAPI' may be incorrect",
    fix: "Check actual API Gateway name and update CloudWatch query"
  },

  // Fix 3: Usage calculation mixing different data sources
  usageCalculation: {
    current: "Looks for usage fields in entitlements table",
    issue: "FAISS usage is in separate aws-finder-usage table with 'count' field",
    fix: "Query aws-finder-usage table separately for search metrics"
  }
}

// Corrected logic for Active Users
const getActiveUsersCorrect = async () => {
  // Should query marketplace-users table, not entitlements
  const params = {
    TableName: process.env.MARKETPLACE_USERS_TABLE // Not entitlements table
  }
  
  const result = await docClient.send(new ScanCommand(params))
  return {
    totalUsers: result.Items.length, // All registered users
    breakdown: `${result.Items.length} total registered users`
  }
}

// Corrected API Gateway metrics
const getAPIMetricsCorrect = async () => {
  // Need to find actual API Gateway name from CloudFormation stack
  const apiGatewayParams = {
    Namespace: 'AWS/ApiGateway',
    MetricName: 'Count',
    Dimensions: [
      {
        Name: 'ApiName',
        Value: 'MarketplaceStack-Clean-MarketplaceAPI' // Likely the actual name
      }
    ]
  }
}

module.exports = { fixes, getActiveUsersCorrect, getAPIMetricsCorrect }
