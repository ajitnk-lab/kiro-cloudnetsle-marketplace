#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { MarketplaceInfrastructureStack } from '../lib/marketplace-infrastructure-stack'

const app = new cdk.App()

// Get environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1', // Deploy to us-east-1 where the original deployment exists
}

// Create the main infrastructure stack with new name to bypass stuck DELETE_FAILED stack
new MarketplaceInfrastructureStack(app, 'MarketplaceStack-v3', {
  env,
  description: 'Marketplace Platform - Main infrastructure stack',
  tags: {
    Project: 'MarketplacePlatform',
    Environment: process.env.ENVIRONMENT || 'development',
  },
})
