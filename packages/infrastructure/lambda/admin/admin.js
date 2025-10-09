const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE;
const SOLUTIONS_TABLE = process.env.SOLUTIONS_TABLE;

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
  const command = new ScanCommand({
    TableName: USERS_TABLE,
    FilterExpression: 'partnerStatus = :status',
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
      applications: result.Items.map(item => ({
        applicationId: item.userId,
        email: item.email,
        companyName: item.companyName,
        createdAt: item.createdAt
      }))
    })
  };
}

async function updateApplication(applicationId, { action }) {
  const status = action === 'approve' ? 'approved' : 'rejected';
  
  const command = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId: applicationId },
    UpdateExpression: 'SET partnerStatus = :status, updatedAt = :updatedAt',
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
