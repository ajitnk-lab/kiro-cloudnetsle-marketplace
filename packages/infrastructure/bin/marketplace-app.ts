#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { MarketplaceInfrastructureStack } from '../lib/marketplace-infrastructure-stack'

const app = new cdk.App()

// Get environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
}

// Create the main infrastructure stack with existing stack name
new MarketplaceInfrastructureStack(app, 'MP-1759859484941', {
  env,
  description: 'Marketplace Platform - Main infrastructure stack',
  tags: {
    Project: 'MarketplacePlatform',
    Environment: process.env.ENVIRONMENT || 'development',
  },
})