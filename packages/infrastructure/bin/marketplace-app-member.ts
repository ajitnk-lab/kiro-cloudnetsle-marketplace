#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { MarketplaceInfrastructureStack } from '../lib/marketplace-infrastructure-stack'

const app = new cdk.App()

// Get environment configuration for MEMBER ACCOUNT
const env = {
  account: '637423202175', // Member account
  region: 'us-east-1', // Deploy to us-east-1 (same as FAISS)
}

// Create the main infrastructure stack for member account
new MarketplaceInfrastructureStack(app, 'MarketplaceStack-Clean', {
  env,
  description: 'Marketplace Platform - Main infrastructure stack (Member Account)',
  tags: {
    Project: 'MarketplacePlatform',
    Environment: 'production',
    MigratedFrom: 'us-west-1-039920874011',
  },
})
