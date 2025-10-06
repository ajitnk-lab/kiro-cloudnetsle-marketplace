import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { 
  Building, 
  MapPin, 
  FileText, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Upload
} from 'lucide-react'

const partnerApplicationSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['individual', 'company', 'organization']),
  businessDescription: z.string().min(10, 'Please provide a detailed business description'),
  contactInfo: z.object({
    phone: z.string().min(10, 'Valid phone number is required'),
    website: z.string().url('Valid website URL is required').optional().or(z.literal('')),
    linkedIn: z.string().url('Valid LinkedIn URL is required').optional().or(z.literal(''))
  }),
  businessAddress: z.object({
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().min(5, 'Valid zip code is required'),
    country: z.string().min(2, 'Country is required')
  }),
  taxInfo: z.object({
    taxId: z.string().min(5, 'Tax ID is required'),
    gstNumber: z.string().optional(),
    panNumber: z.string().min(10, 'PAN number is required')
  }),
  bankInfo: z.object({
    accountHolderName: z.string().min(2, 'Account holder name is required'),
    accountNumber: z.string().min(8, 'Valid account number is required'),
    routingNumber: z.string().min(6, 'Valid routing number is required'),
    bankName: z.string().min(2, 'Bank name is required')
  }),
  documents: z.object({
    businessLicense: z.string().optional(),
    taxCertificate: z.string().optional(),
    identityProof: z.string().optional()
  }).optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the partner terms and conditions',
  })
})

type PartnerApplicationData = z.infer<typeof partnerApplicationSchema>

export function PartnerApplicationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<PartnerApplicationData>({
    resolver: zodResolver(partnerApplicationSchema),
    defaultValues: {
      businessName: user?.profile.company || '',
      businessType: 'company',
      contactInfo: {
        phone: '',
        website: '',
        linkedIn: ''
      },
      businessAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India'
      },
      taxInfo: {
        taxId: '',
        gstNumber: '',
        panNumber: ''
      },
      bankInfo: {
        accountHolderName: '',
        accountNumber: '',
        routingNumber: '',
        bankName: ''
      }
    }
  })

  const businessType = watch('businessType')

  const onSubmit = async (data: PartnerApplicationData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // TODO: Implement API call to submit partner application
      const response = await fetch('/api/partner/application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ application: data })
      })

      if (!response.ok) {
        throw new Error('Failed to submit application')
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        navigate('/partner/dashboard')
      }, 3000)

    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (user?.role !== 'partner') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to partners.</p>
        </div>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your partner application has been submitted successfully. Our team will review it within 3-5 business days.
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Partner Application</h1>
        <p className="text-gray-600 mt-2">
          Complete your partner application to start selling solutions on our marketplace.
        </p>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Business Information */}
        <div className="card">
          <div className="flex items-center mb-6">
            <Building className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                {...register('businessName')}
                type="text"
                className="input-field"
                placeholder="Enter your business name"
              />
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-600">{errors.businessName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Type *
              </label>
              <select {...register('businessType')} className="input-field">
                <option value="individual">Individual/Freelancer</option>
                <option value="company">Private Company</option>
                <option value="organization">Organization/NGO</option>
              </select>
              {errors.businessType && (
                <p className="mt-1 text-sm text-red-600">{errors.businessType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                {...register('contactInfo.phone')}
                type="tel"
                className="input-field"
                placeholder="+91 9876543210"
              />
              {errors.contactInfo?.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.contactInfo.phone.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Description *
              </label>
              <textarea
                {...register('businessDescription')}
                rows={4}
                className="input-field"
                placeholder="Describe your business, products, and services..."
              />
              {errors.businessDescription && (
                <p className="mt-1 text-sm text-red-600">{errors.businessDescription.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                {...register('contactInfo.website')}
                type="url"
                className="input-field"
                placeholder="https://yourwebsite.com"
              />
              {errors.contactInfo?.website && (
                <p className="mt-1 text-sm text-red-600">{errors.contactInfo.website.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn Profile
              </label>
              <input
                {...register('contactInfo.linkedIn')}
                type="url"
                className="input-field"
                placeholder="https://linkedin.com/in/yourprofile"
              />
              {errors.contactInfo?.linkedIn && (
                <p className="mt-1 text-sm text-red-600">{errors.contactInfo.linkedIn.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Business Address */}
        <div className="card">
          <div className="flex items-center mb-6">
            <MapPin className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Business Address</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                {...register('businessAddress.street')}
                type="text"
                className="input-field"
                placeholder="Enter street address"
              />
              {errors.businessAddress?.street && (
                <p className="mt-1 text-sm text-red-600">{errors.businessAddress.street.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                {...register('businessAddress.city')}
                type="text"
                className="input-field"
                placeholder="Enter city"
              />
              {errors.businessAddress?.city && (
                <p className="mt-1 text-sm text-red-600">{errors.businessAddress.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <input
                {...register('businessAddress.state')}
                type="text"
                className="input-field"
                placeholder="Enter state"
              />
              {errors.businessAddress?.state && (
                <p className="mt-1 text-sm text-red-600">{errors.businessAddress.state.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code *
              </label>
              <input
                {...register('businessAddress.zipCode')}
                type="text"
                className="input-field"
                placeholder="Enter ZIP code"
              />
              {errors.businessAddress?.zipCode && (
                <p className="mt-1 text-sm text-red-600">{errors.businessAddress.zipCode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <select {...register('businessAddress.country')} className="input-field">
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </select>
              {errors.businessAddress?.country && (
                <p className="mt-1 text-sm text-red-600">{errors.businessAddress.country.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="card">
          <div className="flex items-center mb-6">
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Tax Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID *
              </label>
              <input
                {...register('taxInfo.taxId')}
                type="text"
                className="input-field"
                placeholder="Enter tax identification number"
              />
              {errors.taxInfo?.taxId && (
                <p className="mt-1 text-sm text-red-600">{errors.taxInfo.taxId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN Number *
              </label>
              <input
                {...register('taxInfo.panNumber')}
                type="text"
                className="input-field"
                placeholder="ABCDE1234F"
              />
              {errors.taxInfo?.panNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.taxInfo.panNumber.message}</p>
              )}
            </div>

            {businessType === 'company' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number
                </label>
                <input
                  {...register('taxInfo.gstNumber')}
                  type="text"
                  className="input-field"
                  placeholder="22AAAAA0000A1Z5"
                />
                {errors.taxInfo?.gstNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxInfo.gstNumber.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bank Information */}
        <div className="card">
          <div className="flex items-center mb-6">
            <CreditCard className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Bank Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Holder Name *
              </label>
              <input
                {...register('bankInfo.accountHolderName')}
                type="text"
                className="input-field"
                placeholder="Enter account holder name"
              />
              {errors.bankInfo?.accountHolderName && (
                <p className="mt-1 text-sm text-red-600">{errors.bankInfo.accountHolderName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name *
              </label>
              <input
                {...register('bankInfo.bankName')}
                type="text"
                className="input-field"
                placeholder="Enter bank name"
              />
              {errors.bankInfo?.bankName && (
                <p className="mt-1 text-sm text-red-600">{errors.bankInfo.bankName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number *
              </label>
              <input
                {...register('bankInfo.accountNumber')}
                type="text"
                className="input-field"
                placeholder="Enter account number"
              />
              {errors.bankInfo?.accountNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.bankInfo.accountNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IFSC Code *
              </label>
              <input
                {...register('bankInfo.routingNumber')}
                type="text"
                className="input-field"
                placeholder="ABCD0123456"
              />
              {errors.bankInfo?.routingNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.bankInfo.routingNumber.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Document Upload */}
        <div className="card">
          <div className="flex items-center mb-6">
            <Upload className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload supporting documents to verify your business. All documents should be in PDF format.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Business License</p>
                <p className="text-xs text-gray-500">PDF, max 5MB</p>
                <button type="button" className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                  Choose File
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Tax Certificate</p>
                <p className="text-xs text-gray-500">PDF, max 5MB</p>
                <button type="button" className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                  Choose File
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Identity Proof</p>
                <p className="text-xs text-gray-500">PDF, max 5MB</p>
                <button type="button" className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                  Choose File
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="card">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('agreeToTerms')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label className="text-gray-700">
                I agree to the{' '}
                <a href="/partner-terms" className="text-blue-600 hover:text-blue-500">
                  Partner Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </a>
              </label>
              {errors.agreeToTerms && (
                <p className="mt-1 text-red-600">{errors.agreeToTerms.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  )
}