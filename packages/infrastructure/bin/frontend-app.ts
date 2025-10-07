#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { FrontendStack } from '../lib/frontend-stack'

declare const process: any

const app = new cdk.App()

// Get the backend stack outputs
const apiEndpoint = app.node.tryGetContext('apiEndpoint') || 'https://ug63mrbfol.execute-api.us-east-1.amazonaws.com/prod/'
const userPoolId = app.node.tryGetContext('userPoolId') || 'us-east-1_a6u2IRDog'
const userPoolClientId = app.node.tryGetContext('userPoolClientId') || '4cveqeb82708poojv03m10r48o'
const assetsBucketName = app.node.tryGetContext('assetsBucketName') || 'marketplace-assets-1759832846643'

new FrontendStack(app, 'MarketplaceFrontendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  apiEndpoint,
  userPoolId,
  userPoolClientId,
  assetsBucketName,
})