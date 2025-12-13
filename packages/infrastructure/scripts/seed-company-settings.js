const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'marketplace-company-settings-1764183053'; // Legacy table preserved for data

const companySettings = {
  settingKey: 'gst-company-info', // Required partition key
  companyId: 'cloudnestle-main',
  gstin: '29XXXXX1234X1ZX', // Replace with actual GSTIN
  legalName: 'CloudNestle Technologies Pvt Ltd',
  address: '123 Tech Park, Electronic City',
  city: 'Bangalore',
  state: 'Karnataka',
  postalCode: '560100',
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
