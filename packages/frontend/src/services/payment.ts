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
  // Billing information (optional, for GST)
  billingCountry?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  isBusinessPurchase?: boolean;
  gstin?: string;
  companyName?: string;
  // GST breakdown
  baseAmount?: number;
  cgst?: number;
  sgst?: number;
  utgst?: number;
  igst?: number;
  gstRate?: number;
  sacCode?: string;
}

export interface PaymentResponse {
  transactionId: string;
  paymentSessionId: string;
  paymentRequestId: string;
  amount: number;
  baseAmount?: number; // Amount before GST
  gstAmount?: number; // GST amount
  gstRate?: number; // GST percentage
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
  async initiatePayment(
    solutionId: string, 
    amount: number, 
    solutionName: string,
    billingInfo?: {
      billingCountry?: string;
      billingAddress?: string;
      billingCity?: string;
      billingState?: string;
      billingPostalCode?: string;
      isBusinessPurchase?: boolean;
      gstin?: string;
      companyName?: string;
      phoneCountryCode?: string;
      phoneNumber?: string;
      gateway?: string;
    },
    gateway: 'cashfree' | 'payu' = 'cashfree'
  ): Promise<void> {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User not authenticated');
      }

      const user = JSON.parse(userStr);
      
      // Combine phone country code and number from billing info
      const fullPhoneNumber = billingInfo?.phoneCountryCode && billingInfo?.phoneNumber 
        ? `${billingInfo.phoneCountryCode}${billingInfo.phoneNumber}`.replace(/\s+/g, '')
        : user.profile?.phone;
      
      const paymentRequest = {
        solutionId,
        userId: user.userId,
        userEmail: user.email,
        userName: user.profile?.name || user.email.split('@')[0],
        userPhone: fullPhoneNumber,
        amount,
        purpose: `Purchase of ${solutionName}`,
        ...billingInfo
      };

      // Use different endpoints based on gateway
      const endpoint = '/payments/initiate';

      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        paymentRequest,
        { headers: this.getAuthHeaders() }
      );
      
      if (gateway === 'payu') {
        // PayU returns form data to submit
        if (response.data.success && response.data.payuFormData) {
          localStorage.setItem('currentTransactionId', response.data.transactionId);
          
          // Create and submit PayU form
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = response.data.payuUrl || 'https://secure.payu.in/_payment';
          
          Object.entries(response.data.payuFormData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
          });
          
          document.body.appendChild(form);
          form.submit();
        } else {
          throw new Error(response.data.error || 'PayU payment initiation failed');
        }
      } else {
        // Cashfree flow
        if (response.data.success && response.data.paymentSessionId) {
          localStorage.setItem('currentTransactionId', response.data.transactionId);
          
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
