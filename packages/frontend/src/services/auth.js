import { Amplify } from 'aws-amplify';
import { signIn, signUp, confirmSignUp, signOut, fetchAuthSession } from 'aws-amplify/auth';
const API_BASE_URL = import.meta.env.VITE_API_URL;
const USER_POOL_ID = import.meta.env.VITE_USER_POOL_ID;
const CLIENT_ID = import.meta.env.VITE_USER_POOL_CLIENT_ID;
// Configure Amplify
Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: USER_POOL_ID,
            userPoolClientId: CLIENT_ID,
            identityPoolId: undefined,
            loginWith: {
                email: true,
            },
            signUpVerificationMethod: 'code',
            userAttributes: {
                email: {
                    required: true,
                },
            },
            allowGuestAccess: false,
            passwordFormat: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecialCharacters: true,
            },
        }
    }
});
export const authService = {
    async login(credentials) {
        try {
            console.log('🔐 Starting login with:', { email: credentials.email });
            try {
                const currentSession = await fetchAuthSession();
                if (currentSession.tokens?.accessToken) {
                    console.log('👤 User already authenticated, using existing session');
                    const accessToken = currentSession.tokens.accessToken.toString();
                    const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        this.setToken(accessToken);
                        this.setStoredUser(userData.user);
                        return { user: userData.user, token: accessToken };
                    }
                    else {
                        const userInfo = currentSession.tokens?.idToken?.payload;
                        if (userInfo) {
                            const user = {
                                userId: userInfo.sub,
                                email: userInfo.email,
                                role: userInfo['custom:role'] || 'customer',
                                profile: {
                                    name: `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
                                    company: userInfo['custom:company'] || '',
                                },
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                status: 'active'
                            };
                            this.setToken(accessToken);
                            this.setStoredUser(user);
                            return { user, token: accessToken };
                        }
                    }
                }
            }
            catch (sessionError) {
                console.log('📝 No existing session, proceeding with login');
            }
            const result = await signIn({
                username: credentials.email,
                password: credentials.password,
            });
            if (result.isSignedIn) {
                const session = await fetchAuthSession();
                const accessToken = session.tokens?.accessToken?.toString();
                const idToken = session.tokens?.idToken?.toString();
                if (accessToken && idToken) {
                    const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
                        headers: { 'Authorization': `Bearer ${idToken}` }
                    });
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        this.setToken(idToken);
                        this.setStoredUser(userData.user);
                        return { user: userData.user, token: idToken };
                    }
                    else {
                        const userInfo = session.tokens?.idToken?.payload;
                        if (userInfo) {
                            const user = {
                                userId: userInfo.sub,
                                email: userInfo.email,
                                role: userInfo['custom:role'] || 'customer',
                                profile: {
                                    name: `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
                                    company: userInfo['custom:company'] || '',
                                },
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                status: 'active'
                            };
                            this.setToken(accessToken);
                            this.setStoredUser(user);
                            return { user, token: accessToken };
                        }
                    }
                }
            }
            throw new Error('Login failed');
        }
        catch (error) {
            console.error('💥 Login error:', error);
            if (error.name === 'UserAlreadyAuthenticatedException') {
                console.log('🔄 Signing out existing user and retrying...');
                await signOut();
                const result = await signIn({
                    username: credentials.email,
                    password: credentials.password,
                });
                if (result.isSignedIn) {
                    const session = await fetchAuthSession();
                    const token = session.tokens?.idToken?.toString();
                    if (token) {
                        const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            this.setToken(token);
                            this.setStoredUser(userData.user);
                            return { user: userData.user, token };
                        }
                        else {
                            const userInfo = session.tokens?.idToken?.payload;
                            if (userInfo) {
                                const user = {
                                    userId: userInfo.sub,
                                    email: userInfo.email,
                                    role: userInfo['custom:role'] || 'customer',
                                    profile: {
                                        name: `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
                                        company: userInfo['custom:company'] || '',
                                    },
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                    status: 'active'
                                };
                                this.setToken(token);
                                this.setStoredUser(user);
                                return { user, token };
                            }
                        }
                    }
                }
            }
            throw new Error(error.message || 'Invalid email or password');
        }
    },
    async register(data) {
        try {
            const fullName = data.name || 'User Name';
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || 'User';
            const lastName = nameParts.slice(1).join(' ') || 'Name';
            const { userId } = await signUp({
                username: data.email,
                password: data.password,
                options: {
                    userAttributes: {
                        email: data.email,
                        given_name: firstName,
                        family_name: lastName,
                        'custom:role': data.role || 'customer',
                        'custom:company': data.company || '',
                    },
                },
            });
            return {
                user: {
                    userId: userId || 'pending',
                    email: data.email,
                    role: data.role || 'customer',
                    profile: {
                        name: fullName,
                        company: data.company || ''
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    status: 'pending'
                },
                token: 'pending-confirmation'
            };
        }
        catch (error) {
            console.error('Registration error:', error);
            throw new Error(error.message || 'Registration failed. Please try again.');
        }
    },
    async confirmRegistration(email, code) {
        try {
            const { isSignUpComplete } = await confirmSignUp({
                username: email,
                confirmationCode: code,
            });
            if (!isSignUpComplete) {
                throw new Error('Confirmation incomplete');
            }
        }
        catch (error) {
            console.error('Confirmation error:', error);
            throw new Error(error.message || 'Verification failed');
        }
    },
    async getCurrentUser() {
        const token = this.getToken();
        if (!token)
            throw new Error('No token found');
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
        throw new Error('Failed to get user profile');
    },
    async updateProfile(profile) {
        const token = this.getToken();
        if (!token)
            throw new Error('No token found');
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ profile })
        });
        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
        throw new Error('Failed to update profile');
    },
    getToken() {
        return localStorage.getItem('authToken');
    },
    setToken(token) {
        localStorage.setItem('authToken', token);
    },
    getStoredUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    setStoredUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    async logout() {
        try {
            await signOut();
        }
        catch (error) {
            console.error('Logout error:', error);
        }
        finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    },
};
