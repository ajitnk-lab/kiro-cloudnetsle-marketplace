#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { MarketplaceInfrastructureStack } from '../lib/marketplace-infrastructure-stack'

// Ensure Node.js types are available
declare const process: any

const app = new cdk.App()

// Get environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
}

// Create the main infrastructure stack
const uniqueId = `MP-${Date.now()}`
new MarketplaceInfrastructureStack(app, uniqueId, {
  env,
  description: 'Marketplace Platform - Main infrastructure stack',
  tags: {
    Project: 'MarketplacePlatform',
    Environment: process.env.ENVIRONMENT || 'development',
  },
})