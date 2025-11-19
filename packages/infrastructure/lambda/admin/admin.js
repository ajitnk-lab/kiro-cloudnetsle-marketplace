const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});

const USERS_TABLE = process.env.USERS_TABLE;
const SOLUTIONS_TABLE = process.env.SOLUTIONS_TABLE;
const PARTNER_APPLICATION_TABLE = process.env.PARTNER_APPLICATION_TABLE_NAME;

console.log('Environment variables:', {
  USERS_TABLE,
  SOLUTIONS_TABLE, 
  PARTNER_APPLICATION_TABLE
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Check admin role
    const userRole = event.requestContext?.authorizer?.claims?.['custom:role'];
    if (userRole !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }

    const { httpMethod, pathParameters, resource } = event;
    
    if (resource === '/admin/applications' && httpMethod === 'GET') {
      return await getPendingApplications();
    }
    
    if (resource === '/admin/applications/{applicationId}' && httpMethod === 'PUT') {
      return await updateApplication(pathParameters.applicationId, JSON.parse(event.body));
    }
    
    if (resource === '/admin/solutions' && httpMethod === 'GET') {
      return await getPendingSolutions();
    }
    
    if (resource === '/admin/solutions/{solutionId}' && httpMethod === 'PUT') {
      return await updateSolution(pathParameters.solutionId, JSON.parse(event.body));
    }
    
    if (resource === '/admin/migrate-user-countries' && httpMethod === 'POST') {
      return await migrateUserCountries();
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function getPendingApplications() {
  console.log('Getting pending applications from table:', PARTNER_APPLICATION_TABLE);
  
  const command = new ScanCommand({
    TableName: PARTNER_APPLICATION_TABLE,
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'pending'
    }
  });

  const result = await docClient.send(command);
  console.log('Raw applications result:', JSON.stringify(result, null, 2));
  
  // Map database fields to UI expected fields and fetch user emails
  const mappedApplications = await Promise.all(result.Items.map(async (item) => {
    let userEmail = 'N/A';
    
    // Fetch user email from users table using userId
    if (item.userId) {
      try {
        const userCommand = new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId: item.userId }
        });
        const userResult = await docClient.send(userCommand);
        if (userResult.Item) {
          userEmail = userResult.Item.email || 'N/A';
        }
      } catch (error) {
        console.error('Error fetching user email:', error);
      }
    }
    
    return {
      applicationId: item.applicationId,
      companyName: item.businessName,
      email: userEmail,
      createdAt: item.submittedAt,
      businessType: item.businessType,
      contactPerson: item.contactInfo?.contactPerson,
      phone: item.contactInfo?.phone,
      address: item.businessAddress,
      website: item.website,
      description: item.description
    };
  }));
  
  console.log('Mapped applications:', JSON.stringify(mappedApplications, null, 2));
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      applications: mappedApplications
    })
  };
}

async function updateApplication(applicationId, { action }) {
  const status = action === 'approve' ? 'approved' : 'rejected';
  
  // Get the application to find userId
  const getAppCommand = new GetCommand({
    TableName: PARTNER_APPLICATION_TABLE,
    Key: { applicationId }
  });
  
  const appResult = await docClient.send(getAppCommand);
  
  if (!appResult.Item) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Application not found' })
    };
  }

  // Update the partner application status
  const updateAppCommand = new UpdateCommand({
    TableName: PARTNER_APPLICATION_TABLE,
    Key: { applicationId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    }
  });

  await docClient.send(updateAppCommand);

  // Get user details for email notification
  let userEmail = null;
  if (appResult.Item.userId) {
    const getUserCommand = new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: appResult.Item.userId }
    });
    
    const userResult = await docClient.send(getUserCommand);
    userEmail = userResult.Item?.email;

    // If approved, update user's partner status
    if (status === 'approved') {
      const updateUserCommand = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId: appResult.Item.userId },
        UpdateExpression: 'SET partnerStatus = :status, marketplaceStatus = :status, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':status': 'approved',
          ':updatedAt': new Date().toISOString()
        }
      });

      await docClient.send(updateUserCommand);
    }
  }

  // Send email notification
  if (userEmail) {
    try {
      const subject = status === 'approved' 
        ? 'Partner Application Approved!' 
        : 'Partner Application Update';

      const body = status === 'approved'
        ? `
          <h2>Congratulations! Your partner application has been approved.</h2>
          <p>You can now start selling solutions on our marketplace!</p>
          <p>Login to your partner dashboard to add your first solution.</p>
          <p>Best regards,<br>Marketplace Team</p>
        `
        : `
          <h2>Partner Application Update</h2>
          <p>Thank you for your interest in becoming a partner. After review, we are unable to approve your application at this time.</p>
          <p>You may reapply in the future if your circumstances change.</p>
          <p>Best regards,<br>Marketplace Team</p>
        `;

      await sesClient.send(new SendEmailCommand({
        Source: 'ajitnk2006+noreply@gmail.com',
        Destination: {
          ToAddresses: [userEmail],
        },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: body } },
        },
      }));
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the main operation if email fails
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ success: true, status })
  };
}

async function getPendingSolutions() {
  const command = new ScanCommand({
    TableName: SOLUTIONS_TABLE,
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'pending'
    }
  });

  const result = await docClient.send(command);
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      solutions: result.Items
    })
  };
}

async function updateSolution(solutionId, { action }) {
  const status = action === 'approve' ? 'approved' : 'rejected';
  
  const command = new UpdateCommand({
    TableName: SOLUTIONS_TABLE,
    Key: { solutionId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    }
  });

  await docClient.send(command);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ success: true })
  };
}

async function migrateUserCountries() {
  try {
    console.log('Starting user country migration...');
    
    // Get all users without country field
    const scanCommand = new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'attribute_not_exists(country) OR country = :empty',
      ExpressionAttributeValues: {
        ':empty': ''
      }
    });
    
    const result = await docClient.send(scanCommand);
    console.log(`Found ${result.Items.length} users without country data`);
    
    let updated = 0;
    for (const user of result.Items) {
      try {
        // Default to India for existing users (since most are expected to be from India)
        const country = 'India';
        
        const updateCommand = new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: user.userId },
          UpdateExpression: 'SET country = :country, #profile.country = :country, updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#profile': 'profile'
          },
          ExpressionAttributeValues: {
            ':country': country,
            ':updatedAt': new Date().toISOString()
          }
        });
        
        await docClient.send(updateCommand);
        updated++;
        console.log(`Updated user ${user.userId} with country: ${country}`);
      } catch (error) {
        console.error(`Error updating user ${user.userId}:`, error);
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: `Updated ${updated} users with country data`,
        totalFound: result.Items.length,
        updated: updated
      })
    };
  } catch (error) {
    console.error('Error in user country migration:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Migration failed', details: error.message })
    };
  }
}
