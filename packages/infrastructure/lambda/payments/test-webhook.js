exports.handler = async (event) => {
  console.log('Test webhook received:', JSON.stringify(event, null, 2))
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      message: 'Webhook endpoint is working',
      timestamp: new Date().toISOString()
    })
  }
}
