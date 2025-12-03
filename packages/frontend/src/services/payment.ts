import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://ug63mrbfol.execute-api.us-east-1.amazonaws.com/prod').replace(/\/$/, '');

export interface PaymentRequest {
  solutionId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  amount: number;
  currency?: string;
  purpose: string;
}

export interface PaymentResponse {
  transactionId: string;
  paymentSessionId: string;
  paymentRequestId: string;
  amount: number;
  currency: string;
  solutionName: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  solutionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentRequestId: string;
  paymentSessionId?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
  solutionName: string;
  userEmail: string;
}

class PaymentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createPaymentRequest(paymentData: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/initiate`,
        paymentData,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Payment request creation failed:', error);
      throw new Error(
        (error as any).response?.data?.error || 'Failed to create payment request'
      );
    }
  }

  async getTransactionStatus(transactionId: string): Promise<Transaction> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/status/${transactionId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch transaction status:', error);
      throw new Error(
        (error as any).response?.data?.error || 'Failed to fetch transaction status'
      );
    }
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/user/${userId}/transactions`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user transactions:', error);
      throw new Error(
        (error as any).response?.data?.error || 'Failed to fetch transactions'
      );
    }
  }

  // Helper method to initiate payment flow
  async initiatePayment(solutionId: string, amount: number, solutionName: string): Promise<void> {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User not authenticated');
      }

      const user = JSON.parse(userStr);
      
      const paymentRequest = {
        solutionId,
        userId: user.userId,
        userEmail: user.email,
        userName: user.profile?.name || user.email.split('@')[0],
        userPhone: user.profile?.phone || undefined,
        amount,
        purpose: `Purchase of ${solutionName}`
      };

      const response = await axios.post(
        `${API_BASE_URL}/payments/initiate`,
        paymentRequest,
        { headers: this.getAuthHeaders() }
      );
      
      if (response.data.success && response.data.paymentSessionId) {
        // Store transaction ID for later reference
        localStorage.setItem('currentTransactionId', response.data.transactionId);
        
        // Use Cashfree JavaScript SDK
        if (window.Cashfree) {
          const cashfree = window.Cashfree({
            mode: "production"
          });
          
          cashfree.checkout({
            paymentSessionId: response.data.paymentSessionId,
            redirectTarget: "_self"
          });
        } else {
          throw new Error('Cashfree SDK not loaded');
        }
      } else {
        throw new Error(response.data.error || 'Payment initiation failed');
      }
      
    } catch (error) {
      console.error('Payment initiation failed:', error);
      throw error;
    }
  }

  // Helper method to handle payment success callback
  async handlePaymentSuccess(_paymentId?: string, _paymentRequestId?: string): Promise<Transaction | null> {
    try {
      const transactionId = localStorage.getItem('currentTransactionId');
      if (!transactionId) {
        console.warn('No transaction ID found in localStorage');
        return null;
      }

      // Poll for transaction status update
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const transaction = await this.getTransactionStatus(transactionId);
        
        if (transaction.status === 'completed') {
          localStorage.removeItem('currentTransactionId');
          return transaction;
        }
        
        if (transaction.status === 'failed') {
          localStorage.removeItem('currentTransactionId');
          throw new Error('Payment failed');
        }
        
        // Wait 2 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
      
      // If still pending after max attempts, return the transaction
      const transaction = await this.getTransactionStatus(transactionId);
      return transaction;
      
    } catch (error) {
      console.error('Error handling payment success:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
