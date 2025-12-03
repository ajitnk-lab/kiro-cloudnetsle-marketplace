#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const marketplace_infrastructure_stack_1 = require("../lib/marketplace-infrastructure-stack");
const app = new cdk.App();
// Get environment configuration
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-west-1', // Deploy to us-west-1 with unique names
};
// Create the main infrastructure stack with new name
new marketplace_infrastructure_stack_1.MarketplaceInfrastructureStack(app, 'MarketplaceStack-Clean', {
    env,
    description: 'Marketplace Platform - Main infrastructure stack',
    tags: {
        Project: 'MarketplacePlatform',
        Environment: process.env.ENVIRONMENT || 'development',
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2V0cGxhY2UtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFvQztBQUNwQyxpREFBa0M7QUFDbEMsOEZBQXdGO0FBRXhGLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBO0FBRXpCLGdDQUFnQztBQUNoQyxNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtJQUN4QyxNQUFNLEVBQUUsV0FBVyxFQUFFLHdDQUF3QztDQUM5RCxDQUFBO0FBRUQscURBQXFEO0FBQ3JELElBQUksaUVBQThCLENBQUMsR0FBRyxFQUFFLHdCQUF3QixFQUFFO0lBQ2hFLEdBQUc7SUFDSCxXQUFXLEVBQUUsa0RBQWtEO0lBQy9ELElBQUksRUFBRTtRQUNKLE9BQU8sRUFBRSxxQkFBcUI7UUFDOUIsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLGFBQWE7S0FDdEQ7Q0FDRixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcidcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCB7IE1hcmtldHBsYWNlSW5mcmFzdHJ1Y3R1cmVTdGFjayB9IGZyb20gJy4uL2xpYi9tYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjaydcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKVxuXG4vLyBHZXQgZW52aXJvbm1lbnQgY29uZmlndXJhdGlvblxuY29uc3QgZW52ID0ge1xuICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICByZWdpb246ICd1cy13ZXN0LTEnLCAvLyBEZXBsb3kgdG8gdXMtd2VzdC0xIHdpdGggdW5pcXVlIG5hbWVzXG59XG5cbi8vIENyZWF0ZSB0aGUgbWFpbiBpbmZyYXN0cnVjdHVyZSBzdGFjayB3aXRoIG5ldyBuYW1lXG5uZXcgTWFya2V0cGxhY2VJbmZyYXN0cnVjdHVyZVN0YWNrKGFwcCwgJ01hcmtldHBsYWNlU3RhY2stQ2xlYW4nLCB7XG4gIGVudixcbiAgZGVzY3JpcHRpb246ICdNYXJrZXRwbGFjZSBQbGF0Zm9ybSAtIE1haW4gaW5mcmFzdHJ1Y3R1cmUgc3RhY2snLFxuICB0YWdzOiB7XG4gICAgUHJvamVjdDogJ01hcmtldHBsYWNlUGxhdGZvcm0nLFxuICAgIEVudmlyb25tZW50OiBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2ZWxvcG1lbnQnLFxuICB9LFxufSlcbiJdfQ==