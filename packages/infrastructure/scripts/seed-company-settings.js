const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.COMPANY_SETTINGS_TABLE_NAME || 'marketplace-company-settings-prod';

const companySettings = {
  settingKey: 'gst-company-info', // Required partition key
  companyId: 'cloudnestle-main',
  gstin: '29XXXXX1234X1ZX', // Replace with actual GSTIN
  legalName: 'CloudNestle Technologies Pvt Ltd',
  address: 'Ground floor, #85, 2nd Cross Road, Central Excise Layout, Vijay Nagar, Bengaluru 560040',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560040',
  country: 'India',
  hsnSacCode: '998314', // HSN/SAC code for IT services
};

async function seedCompanySettings() {
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: companySettings
    }));
    console.log('✅ Company settings seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding company settings:', error);
    process.exit(1);
  }
}

seedCompanySettings();
