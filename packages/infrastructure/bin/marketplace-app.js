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
// Create the main infrastructure stack
new marketplace_infrastructure_stack_1.MarketplaceInfrastructureStack(app, 'MarketplaceInfrastructureStack', {
    env,
    description: 'Marketplace Platform - Main infrastructure stack',
    tags: {
        Project: 'MarketplacePlatform',
        Environment: process.env.ENVIRONMENT || 'development',
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2V0cGxhY2UtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFvQztBQUNwQyxpREFBa0M7QUFDbEMsOEZBQXdGO0FBS3hGLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBO0FBRXpCLGdDQUFnQztBQUNoQyxNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtJQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0NBQ3RELENBQUE7QUFFRCx1Q0FBdUM7QUFDdkMsSUFBSSxpRUFBOEIsQ0FBQyxHQUFHLEVBQUUsZ0NBQWdDLEVBQUU7SUFDeEUsR0FBRztJQUNILFdBQVcsRUFBRSxrREFBa0Q7SUFDL0QsSUFBSSxFQUFFO1FBQ0osT0FBTyxFQUFFLHFCQUFxQjtRQUM5QixXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksYUFBYTtLQUN0RDtDQUNGLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcclxuaW1wb3J0IHsgTWFya2V0cGxhY2VJbmZyYXN0cnVjdHVyZVN0YWNrIH0gZnJvbSAnLi4vbGliL21hcmtldHBsYWNlLWluZnJhc3RydWN0dXJlLXN0YWNrJ1xyXG5cclxuLy8gRW5zdXJlIE5vZGUuanMgdHlwZXMgYXJlIGF2YWlsYWJsZVxyXG5kZWNsYXJlIGNvbnN0IHByb2Nlc3M6IGFueVxyXG5cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKVxyXG5cclxuLy8gR2V0IGVudmlyb25tZW50IGNvbmZpZ3VyYXRpb25cclxuY29uc3QgZW52ID0ge1xyXG4gIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbn1cclxuXHJcbi8vIENyZWF0ZSB0aGUgbWFpbiBpbmZyYXN0cnVjdHVyZSBzdGFja1xyXG5uZXcgTWFya2V0cGxhY2VJbmZyYXN0cnVjdHVyZVN0YWNrKGFwcCwgJ01hcmtldHBsYWNlSW5mcmFzdHJ1Y3R1cmVTdGFjaycsIHtcclxuICBlbnYsXHJcbiAgZGVzY3JpcHRpb246ICdNYXJrZXRwbGFjZSBQbGF0Zm9ybSAtIE1haW4gaW5mcmFzdHJ1Y3R1cmUgc3RhY2snLFxyXG4gIHRhZ3M6IHtcclxuICAgIFByb2plY3Q6ICdNYXJrZXRwbGFjZVBsYXRmb3JtJyxcclxuICAgIEVudmlyb25tZW50OiBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2ZWxvcG1lbnQnLFxyXG4gIH0sXHJcbn0pIl19