const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Default commission rates
const DEFAULT_COMMISSION_RATES = {
  'Business Software': 0.15, // 15%
  'Development Tools': 0.12, // 12%
  'Marketing & Sales': 0.18, // 18%
  'Analytics & Data': 0.15, // 15%
  'Communication': 0.14, // 14%
  'E-commerce': 0.20, // 20%
  'Security': 0.16, // 16%
  'Productivity': 0.13, // 13%
  'Design & Creative': 0.17, // 17%
  'Education': 0.10, // 10%
  'default': 0.15 // 15% default
};

exports.calculateCommission = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const { transactionId, solutionId, amount, category, partnerId } = JSON.parse(event.body);

    if (!transactionId || !solutionId || !amount || !partnerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: transactionId, solutionId, amount, partnerId'
        })
      };
    }

    // Get commission rate for category
    const commissionRate = await getCommissionRate(category);
    
    // Calculate commission
    const commissionAmount = amount * commissionRate;
    const partnerEarnings = amount - commissionAmount;

    // Record commission calculation
    const commissionRecord = {
      transactionId,
      solutionId,
      partnerId,
      category: category || 'default',
      grossAmount: amount,
      commissionRate,
      commissionAmount,
      partnerEarnings,
      calculatedAt: new Date().toISOString(),
      status: 'calculated'
    };

    await dynamodb.put({
      TableName: process.env.TRANSACTIONS_TABLE,
      Key: { transactionId },
      UpdateExpression: 'SET commissionData = :commissionData, partnerEarnings = :partnerEarnings',
      ExpressionAttributeValues: {
        ':commissionData': commissionRecord,
        ':partnerEarnings': partnerEarnings
      }
    }).promise();

    // Update partner monthly earnings
    await updatePartnerEarnings(partnerId, partnerEarnings, commissionAmount);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        transactionId,
        commissionCalculation: commissionRecord
      })
    };

  } catch (error) {
    console.error('Commission calculation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

exports.getCommissionSettings = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const result = await dynamodb.scan({
      TableName: process.env.COMMISSION_SETTINGS_TABLE
    }).promise();

    const settings = result.Items || [];
    
    // If no custom settings, return defaults
    if (settings.length === 0) {
      const defaultSettings = Object.entries(DEFAULT_COMMISSION_RATES).map(([category, rate]) => ({
        settingId: `default-${category}`,
        category,
        commissionRate: rate,
        effectiveDate: '2024-01-01',
        isDefault: true
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ settings: defaultSettings })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ settings })
    };

  } catch (error) {
    console.error('Error fetching commission settings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

exports.updateCommissionSettings = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const { category, commissionRate, effectiveDate } = JSON.parse(event.body);

    if (!category || commissionRate === undefined || !effectiveDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: category, commissionRate, effectiveDate'
        })
      };
    }

    if (commissionRate < 0 || commissionRate > 1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Commission rate must be between 0 and 1'
        })
      };
    }

    const settingId = `${category}-${effectiveDate}`;
    const setting = {
      settingId,
      category,
      commissionRate,
      effectiveDate,
      updatedAt: new Date().toISOString(),
      isDefault: false
    };

    await dynamodb.put({
      TableName: process.env.COMMISSION_SETTINGS_TABLE,
      Item: setting
    }).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ setting })
    };

  } catch (error) {
    console.error('Error updating commission settings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

exports.getPartnerEarnings = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const { partnerId } = event.pathParameters;
    const { startMonth, endMonth } = event.queryStringParameters || {};

    let keyCondition = 'partnerId = :partnerId';
    let expressionAttributeValues = { ':partnerId': partnerId };

    if (startMonth && endMonth) {
      keyCondition += ' AND #month BETWEEN :startMonth AND :endMonth';
      expressionAttributeValues[':startMonth'] = startMonth;
      expressionAttributeValues[':endMonth'] = endMonth;
    }

    const result = await dynamodb.query({
      TableName: process.env.PARTNER_EARNINGS_TABLE,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeNames: startMonth && endMonth ? { '#month': 'month' } : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false // Most recent first
    }).promise();

    const earnings = result.Items || [];
    const totalEarnings = earnings.reduce((sum, earning) => sum + (earning.totalEarnings || 0), 0);
    const totalCommissions = earnings.reduce((sum, earning) => sum + (earning.totalCommissions || 0), 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        partnerId,
        earnings,
        summary: {
          totalEarnings,
          totalCommissions,
          totalTransactions: earnings.reduce((sum, earning) => sum + (earning.transactionCount || 0), 0),
          monthsCount: earnings.length
        }
      })
    };

  } catch (error) {
    console.error('Error fetching partner earnings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

exports.getAllPartnerEarnings = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const { month } = event.queryStringParameters || {};
    const currentMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format

    const result = await dynamodb.query({
      TableName: process.env.PARTNER_EARNINGS_TABLE,
      IndexName: 'MonthIndex',
      KeyConditionExpression: '#month = :month',
      ExpressionAttributeNames: { '#month': 'month' },
      ExpressionAttributeValues: { ':month': currentMonth },
      ScanIndexForward: false // Highest earnings first
    }).promise();

    const earnings = result.Items || [];
    const totalPlatformEarnings = earnings.reduce((sum, earning) => sum + (earning.totalCommissions || 0), 0);
    const totalPartnerEarnings = earnings.reduce((sum, earning) => sum + (earning.totalEarnings || 0), 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        month: currentMonth,
        partnerEarnings: earnings,
        platformSummary: {
          totalPlatformEarnings,
          totalPartnerEarnings,
          totalRevenue: totalPlatformEarnings + totalPartnerEarnings,
          partnerCount: earnings.length
        }
      })
    };

  } catch (error) {
    console.error('Error fetching all partner earnings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

// Helper functions
async function getCommissionRate(category) {
  try {
    // Try to get custom commission rate for category
    const result = await dynamodb.query({
      TableName: process.env.COMMISSION_SETTINGS_TABLE,
      IndexName: 'CategoryIndex',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: { ':category': category || 'default' },
      ScanIndexForward: false, // Most recent first
      Limit: 1
    }).promise();

    if (result.Items && result.Items.length > 0) {
      return result.Items[0].commissionRate;
    }

    // Fall back to default rate
    return DEFAULT_COMMISSION_RATES[category] || DEFAULT_COMMISSION_RATES.default;
  } catch (error) {
    console.error('Error getting commission rate:', error);
    return DEFAULT_COMMISSION_RATES.default;
  }
}

async function updatePartnerEarnings(partnerId, earnings, commission) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Try to get existing earnings record
    const existingResult = await dynamodb.get({
      TableName: process.env.PARTNER_EARNINGS_TABLE,
      Key: { partnerId, month: currentMonth }
    }).promise();

    if (existingResult.Item) {
      // Update existing record
      await dynamodb.update({
        TableName: process.env.PARTNER_EARNINGS_TABLE,
        Key: { partnerId, month: currentMonth },
        UpdateExpression: 'ADD totalEarnings :earnings, totalCommissions :commission, transactionCount :count SET updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':earnings': earnings,
          ':commission': commission,
          ':count': 1,
          ':updatedAt': new Date().toISOString()
        }
      }).promise();
    } else {
      // Create new record
      await dynamodb.put({
        TableName: process.env.PARTNER_EARNINGS_TABLE,
        Item: {
          partnerId,
          month: currentMonth,
          totalEarnings: earnings,
          totalCommissions: commission,
          transactionCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }).promise();
    }
  } catch (error) {
    console.error('Error updating partner earnings:', error);
    throw error;
  }
}