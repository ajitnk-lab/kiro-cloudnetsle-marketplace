const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb')
const { fromIni } = require('@aws-sdk/credential-providers')

const dynamoClient = new DynamoDBClient({ 
  region: 'us-east-1',
  credentials: fromIni({ profile: 'member-account' })
})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const USER_SOLUTION_ENTITLEMENTS_TABLE = 'marketplace-user-solution-entitlements-1764183053'

async function migrateProUsers() {
  console.log('🔄 Starting migration of existing pro users...')
  
  try {
    // Scan for all pro users without expiry date
    const scanCommand = new ScanCommand({
      TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
      FilterExpression: 'access_tier = :tier AND attribute_not_exists(pro_expires_at)',
      ExpressionAttributeValues: {
        ':tier': 'pro'
      }
    })

    const result = await docClient.send(scanCommand)
    const proUsers = result.Items || []
    
    console.log(`📊 Found ${proUsers.length} pro users without expiry dates`)
    
    if (proUsers.length === 0) {
      console.log('✅ No pro users need migration')
      return
    }

    // Set expiry to 30 days from today for all existing pro users
    const proExpiresAt = new Date()
    proExpiresAt.setDate(proExpiresAt.getDate() + 30)
    const expiryDateString = proExpiresAt.toISOString()
    
    console.log(`📅 Setting expiry date to: ${expiryDateString}`)
    
    let updated = 0
    let errors = 0
    
    for (const user of proUsers) {
      try {
        await docClient.send(new UpdateCommand({
          TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
          Key: {
            pk: user.pk,
            sk: user.sk
          },
          UpdateExpression: 'SET pro_expires_at = :expires, updated_at = :updated',
          ExpressionAttributeValues: {
            ':expires': expiryDateString,
            ':updated': new Date().toISOString()
          }
        }))
        
        updated++
        console.log(`✅ Updated user: ${user.pk} - ${user.sk}`)
        
      } catch (error) {
        errors++
        console.error(`❌ Error updating user ${user.pk}:`, error.message)
      }
    }
    
    console.log('\n📈 Migration Summary:')
    console.log(`   ✅ Successfully updated: ${updated} users`)
    console.log(`   ❌ Errors: ${errors} users`)
    console.log(`   📅 Expiry date set to: ${expiryDateString}`)
    console.log('🎉 Migration completed!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateProUsers()
