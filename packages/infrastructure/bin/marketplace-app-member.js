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
// Get environment configuration for MEMBER ACCOUNT
const env = {
    account: '637423202175', // Member account
    region: 'us-east-1', // Deploy to us-east-1 (same as FAISS)
};
// Create the main infrastructure stack for member account
new marketplace_infrastructure_stack_1.MarketplaceInfrastructureStack(app, 'MarketplaceStack-Clean', {
    env,
    description: 'Marketplace Platform - Main infrastructure stack (Member Account)',
    tags: {
        Project: 'MarketplacePlatform',
        Environment: 'production',
        MigratedFrom: 'us-west-1-039920874011',
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtYXBwLW1lbWJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcmtldHBsYWNlLWFwcC1tZW1iZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQW9DO0FBQ3BDLGlEQUFrQztBQUNsQyw4RkFBd0Y7QUFFeEYsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUE7QUFFekIsbURBQW1EO0FBQ25ELE1BQU0sR0FBRyxHQUFHO0lBQ1YsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUI7SUFDMUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxzQ0FBc0M7Q0FDNUQsQ0FBQTtBQUVELDBEQUEwRDtBQUMxRCxJQUFJLGlFQUE4QixDQUFDLEdBQUcsRUFBRSx3QkFBd0IsRUFBRTtJQUNoRSxHQUFHO0lBQ0gsV0FBVyxFQUFFLG1FQUFtRTtJQUNoRixJQUFJLEVBQUU7UUFDSixPQUFPLEVBQUUscUJBQXFCO1FBQzlCLFdBQVcsRUFBRSxZQUFZO1FBQ3pCLFlBQVksRUFBRSx3QkFBd0I7S0FDdkM7Q0FDRixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcidcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCB7IE1hcmtldHBsYWNlSW5mcmFzdHJ1Y3R1cmVTdGFjayB9IGZyb20gJy4uL2xpYi9tYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjaydcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKVxuXG4vLyBHZXQgZW52aXJvbm1lbnQgY29uZmlndXJhdGlvbiBmb3IgTUVNQkVSIEFDQ09VTlRcbmNvbnN0IGVudiA9IHtcbiAgYWNjb3VudDogJzYzNzQyMzIwMjE3NScsIC8vIE1lbWJlciBhY2NvdW50XG4gIHJlZ2lvbjogJ3VzLWVhc3QtMScsIC8vIERlcGxveSB0byB1cy1lYXN0LTEgKHNhbWUgYXMgRkFJU1MpXG59XG5cbi8vIENyZWF0ZSB0aGUgbWFpbiBpbmZyYXN0cnVjdHVyZSBzdGFjayBmb3IgbWVtYmVyIGFjY291bnRcbm5ldyBNYXJrZXRwbGFjZUluZnJhc3RydWN0dXJlU3RhY2soYXBwLCAnTWFya2V0cGxhY2VTdGFjay1DbGVhbicsIHtcbiAgZW52LFxuICBkZXNjcmlwdGlvbjogJ01hcmtldHBsYWNlIFBsYXRmb3JtIC0gTWFpbiBpbmZyYXN0cnVjdHVyZSBzdGFjayAoTWVtYmVyIEFjY291bnQpJyxcbiAgdGFnczoge1xuICAgIFByb2plY3Q6ICdNYXJrZXRwbGFjZVBsYXRmb3JtJyxcbiAgICBFbnZpcm9ubWVudDogJ3Byb2R1Y3Rpb24nLFxuICAgIE1pZ3JhdGVkRnJvbTogJ3VzLXdlc3QtMS0wMzk5MjA4NzQwMTEnLFxuICB9LFxufSlcbiJdfQ==