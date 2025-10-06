import { z } from 'zod';

// User Registration Schema
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  role: z.enum(['customer', 'partner'], {
    required_error: 'Please select a role'
  }),
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'You must agree to the terms and conditions')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Login Schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
});

// Profile Update Schema
export const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  phone: z
    .string()
    .optional()
    .refine(val => !val || /^\+?[\d\s-()]+$/.test(val), 'Please enter a valid phone number'),
  company: z
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
});

// Partner Application Schema
export const partnerApplicationSchema = z.object({
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters'),
  businessType: z.enum(['individual', 'company', 'startup'], {
    required_error: 'Please select a business type'
  }),
  businessDescription: z
    .string()
    .min(50, 'Business description must be at least 50 characters')
    .max(1000, 'Business description must be less than 1000 characters'),
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  contactPerson: z
    .string()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(50, 'Contact person name must be less than 50 characters'),
  contactEmail: z
    .string()
    .email('Please enter a valid email address'),
  contactPhone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number'),
  businessAddress: z.object({
    street: z.string().min(5, 'Street address must be at least 5 characters'),
    city: z.string().min(2, 'City must be at least 2 characters'),
    state: z.string().min(2, 'State must be at least 2 characters'),
    postalCode: z.string().min(5, 'Postal code must be at least 5 characters'),
    country: z.string().min(2, 'Country must be at least 2 characters')
  }),
  taxInformation: z.object({
    taxId: z.string().min(5, 'Tax ID must be at least 5 characters'),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional()
  }),
  bankDetails: z.object({
    accountHolderName: z.string().min(2, 'Account holder name is required'),
    accountNumber: z.string().min(8, 'Account number must be at least 8 digits'),
    bankName: z.string().min(2, 'Bank name is required'),
    ifscCode: z.string().min(11, 'IFSC code must be 11 characters').max(11),
    accountType: z.enum(['savings', 'current'], {
      required_error: 'Please select account type'
    })
  }),
  documents: z.object({
    businessLicense: z.boolean().refine(val => val === true, 'Business license is required'),
    taxCertificate: z.boolean().refine(val => val === true, 'Tax certificate is required'),
    bankStatement: z.boolean().optional()
  }),
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'You must agree to the partner terms and conditions')
});

// Solution Creation Schema
export const solutionSchema = z.object({
  name: z
    .string()
    .min(3, 'Solution name must be at least 3 characters')
    .max(100, 'Solution name must be less than 100 characters'),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  category: z
    .string()
    .min(1, 'Please select a category'),
  pricing: z.object({
    type: z.enum(['upfront', 'subscription'], {
      required_error: 'Please select a pricing type'
    }),
    upfrontPrice: z
      .number()
      .min(0, 'Price must be positive')
      .optional(),
    monthlyPrice: z
      .number()
      .min(0, 'Price must be positive')
      .optional(),
    currency: z.string().default('INR')
  }).refine(data => {
    if (data.type === 'upfront' && (!data.upfrontPrice || data.upfrontPrice <= 0)) {
      return false;
    }
    if (data.type === 'subscription' && (!data.monthlyPrice || data.monthlyPrice <= 0)) {
      return false;
    }
    return true;
  }, {
    message: 'Please enter a valid price for the selected pricing type'
  }),
  features: z
    .array(z.string().min(1, 'Feature cannot be empty'))
    .min(1, 'At least one feature is required')
    .max(10, 'Maximum 10 features allowed'),
  tags: z
    .array(z.string().min(1, 'Tag cannot be empty'))
    .max(10, 'Maximum 10 tags allowed'),
  requirements: z
    .string()
    .max(1000, 'Requirements must be less than 1000 characters')
    .optional(),
  supportInfo: z
    .string()
    .max(500, 'Support information must be less than 500 characters')
    .optional()
});

// Payment Schema
export const paymentSchema = z.object({
  solutionId: z.string().min(1, 'Solution ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('INR'),
  purpose: z.string().min(1, 'Purpose is required')
});

// Search Schema
export const searchSchema = z.object({
  query: z.string().max(100, 'Search query must be less than 100 characters').optional(),
  category: z.string().optional(),
  priceMin: z.number().min(0, 'Minimum price must be positive').optional(),
  priceMax: z.number().min(0, 'Maximum price must be positive').optional(),
  pricingModel: z.enum(['upfront', 'subscription']).optional(),
  sortBy: z.enum(['name', 'price', 'rating', 'created']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().min(1, 'Page must be at least 1').default(1),
  limit: z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20)
}).refine(data => {
  if (data.priceMin && data.priceMax && data.priceMin > data.priceMax) {
    return false;
  }
  return true;
}, {
  message: 'Minimum price cannot be greater than maximum price',
  path: ['priceMax']
});

// Contact Form Schema
export const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .email('Please enter a valid email address'),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be less than 100 characters'),
  message: z
    .string()
    .min(20, 'Message must be at least 20 characters')
    .max(1000, 'Message must be less than 1000 characters')
});

// Export types
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type PartnerApplicationFormData = z.infer<typeof partnerApplicationSchema>;
export type SolutionFormData = z.infer<typeof solutionSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type SearchFormData = z.infer<typeof searchSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;