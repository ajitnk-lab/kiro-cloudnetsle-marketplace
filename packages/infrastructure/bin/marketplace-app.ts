#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { MarketplaceInfrastructureStack } from '../lib/marketplace-infrastructure-stack'

const app = new cdk.App()

// Get environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-west-1', // Deploy to us-west-1 with unique names
}

// Create the main infrastructure stack with new name
new MarketplaceInfrastructureStack(app, 'MarketplaceStack-Clean', {
  env,
  description: 'Marketplace Platform - Main infrastructure stack',
  tags: {
    Project: 'MarketplacePlatform',
    Environment: process.env.ENVIRONMENT || 'development',
  },
})
