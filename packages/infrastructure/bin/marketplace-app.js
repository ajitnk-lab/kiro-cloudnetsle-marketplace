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
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};
// Create the main infrastructure stack with existing stack name
new marketplace_infrastructure_stack_1.MarketplaceInfrastructureStack(app, 'MP-1762926799834', {
    env,
    description: 'Marketplace Platform - Main infrastructure stack',
    tags: {
        Project: 'MarketplacePlatform',
        Environment: process.env.ENVIRONMENT || 'development',
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2V0cGxhY2UtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFvQztBQUNwQyxpREFBa0M7QUFDbEMsOEZBQXdGO0FBRXhGLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBO0FBRXpCLGdDQUFnQztBQUNoQyxNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtJQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0NBQ3RELENBQUE7QUFFRCxnRUFBZ0U7QUFDaEUsSUFBSSxpRUFBOEIsQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLEVBQUU7SUFDMUQsR0FBRztJQUNILFdBQVcsRUFBRSxrREFBa0Q7SUFDL0QsSUFBSSxFQUFFO1FBQ0osT0FBTyxFQUFFLHFCQUFxQjtRQUM5QixXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksYUFBYTtLQUN0RDtDQUNGLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJ1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0IHsgTWFya2V0cGxhY2VJbmZyYXN0cnVjdHVyZVN0YWNrIH0gZnJvbSAnLi4vbGliL21hcmtldHBsYWNlLWluZnJhc3RydWN0dXJlLXN0YWNrJ1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpXG5cbi8vIEdldCBlbnZpcm9ubWVudCBjb25maWd1cmF0aW9uXG5jb25zdCBlbnYgPSB7XG4gIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxufVxuXG4vLyBDcmVhdGUgdGhlIG1haW4gaW5mcmFzdHJ1Y3R1cmUgc3RhY2sgd2l0aCBleGlzdGluZyBzdGFjayBuYW1lXG5uZXcgTWFya2V0cGxhY2VJbmZyYXN0cnVjdHVyZVN0YWNrKGFwcCwgJ01QLTE3NjI5MjY3OTk4MzQnLCB7XG4gIGVudixcbiAgZGVzY3JpcHRpb246ICdNYXJrZXRwbGFjZSBQbGF0Zm9ybSAtIE1haW4gaW5mcmFzdHJ1Y3R1cmUgc3RhY2snLFxuICB0YWdzOiB7XG4gICAgUHJvamVjdDogJ01hcmtldHBsYWNlUGxhdGZvcm0nLFxuICAgIEVudmlyb25tZW50OiBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2ZWxvcG1lbnQnLFxuICB9LFxufSkiXX0=