# Deployment Information

## Frontend URL

**Current Working Frontend URL:** 
`http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com`

### Important Notes:
- CloudFront distribution is not working properly
- Using direct S3 website hosting as workaround
- Deploy frontend using: `aws s3 sync dist/ s3://marketplace-frontend-20251007232833 --delete --region us-east-1`

### Infrastructure vs Reality:
- **CDK Creates**: `marketplace-frontend-1760039158355` + CloudFront `https://d3mg3pu1g6vmon.cloudfront.net`
- **Actually Using**: `marketplace-frontend-20251007232833` (S3 website hosting)

## API Gateway
- **URL**: `https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/`

## DynamoDB Tables (Current)
- **Users**: `MP-1759859484941-DataStackUserTableDAF10CB8-MM0KVOMUI09Z`
- **Solutions**: `MP-1759859484941-DataStackSolutionTable263711A4-152RYQUO5ELUL`
- **Partner Applications**: `MP-1759859484941-DataStackPartnerApplicationTable548221AF-1XYHN9D5GAA2F`
