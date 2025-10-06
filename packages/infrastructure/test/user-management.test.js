const { handler } = require('../lambda/auth/user-management')

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb')
jest.mock('@aws-sdk/lib-dynamodb')
jest.mock('@aws-sdk/client-cognito-identity-provider')

const mockDynamoClient = {
  send: jest.fn(),
}

const mockCognitoClient = {
  send: jest.fn(),
}

// Mock the modules
require('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient = {
  from: jest.fn(() => mockDynamoClient),
}

require('@aws-sdk/client-cognito-identity-provider').CognitoIdentityProviderClient = jest.fn(() => mockCognitoClient)

describe('User Management Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.USER_TABLE_NAME = 'test-users'
    process.env.USER_POOL_ID = 'test-pool'
  })

  describe('GET /user/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer',
        profile: { name: 'Test User' },
        createdAt: '2024-01-01T00:00:00Z',
      }

      mockDynamoClient.send.mockResolvedValueOnce({
        Item: mockUser,
      })

      const event = {
        httpMethod: 'GET',
        resource: '/user/profile',
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user123',
            },
          },
        },
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        user: mockUser,
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      const event = {
        httpMethod: 'GET',
        resource: '/user/profile',
        requestContext: {},
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      expect(JSON.parse(result.body)).toEqual({
        error: 'Unauthorized',
      })
    })

    it('should return 404 when user profile not found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: null,
      })

      const event = {
        httpMethod: 'GET',
        resource: '/user/profile',
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user123',
            },
          },
        },
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(404)
      expect(JSON.parse(result.body)).toEqual({
        error: 'User profile not found',
      })
    })
  })

  describe('PUT /user/profile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer',
        profile: { name: 'Updated Name', company: 'Test Corp' },
        updatedAt: expect.any(String),
      }

      mockDynamoClient.send.mockResolvedValueOnce({
        Attributes: updatedUser,
      })

      const event = {
        httpMethod: 'PUT',
        resource: '/user/profile',
        body: JSON.stringify({
          profile: { name: 'Updated Name', company: 'Test Corp' },
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user123',
            },
          },
        },
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        message: 'Profile updated successfully',
        user: updatedUser,
      })
    })

    it('should return 400 for invalid profile data', async () => {
      const event = {
        httpMethod: 'PUT',
        resource: '/user/profile',
        body: JSON.stringify({
          profile: { name: 'A' }, // Too short
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user123',
            },
          },
        },
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Validation failed')
      expect(JSON.parse(result.body)).toHaveProperty('details')
    })
  })

  describe('Admin Operations', () => {
    it('should allow admin to list users', async () => {
      const mockUsers = [
        { userId: 'user1', email: 'user1@example.com', role: 'customer' },
        { userId: 'user2', email: 'user2@example.com', role: 'partner' },
      ]

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: mockUsers,
        Count: 2,
      })

      const event = {
        httpMethod: 'GET',
        resource: '/admin/users',
        queryStringParameters: {},
        requestContext: {
          authorizer: {
            claims: {
              sub: 'admin123',
              'custom:role': 'admin',
            },
          },
        },
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        users: mockUsers,
        count: 2,
        lastKey: null,
      })
    })

    it('should deny non-admin access to admin endpoints', async () => {
      const event = {
        httpMethod: 'GET',
        resource: '/admin/users',
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user123',
              'custom:role': 'customer',
            },
          },
        },
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      expect(JSON.parse(result.body)).toEqual({
        error: 'Admin access required',
      })
    })
  })

  describe('Public User Profile', () => {
    it('should return limited public profile', async () => {
      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'partner',
        profile: { name: 'Test User', company: 'Test Corp' },
        createdAt: '2024-01-01T00:00:00Z',
      }

      mockDynamoClient.send.mockResolvedValueOnce({
        Item: mockUser,
      })

      const event = {
        httpMethod: 'GET',
        pathParameters: { userId: 'user123' },
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        user: {
          userId: 'user123',
          profile: {
            name: 'Test User',
            company: 'Test Corp',
          },
          role: 'partner',
          createdAt: '2024-01-01T00:00:00Z',
        },
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('DynamoDB error'))

      const event = {
        httpMethod: 'GET',
        resource: '/user/profile',
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user123',
            },
          },
        },
      }

      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error',
      })
    })
  })
})