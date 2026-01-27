import React from 'react'
import { Shield, CheckCircle, Globe } from 'lucide-react'

interface TrustBadgeProps {
  type: 'gst' | 'msme' | 'iec'
  value: string
  className?: string
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ type, value, className = '' }) => {
  const badges = {
    gst: {
      icon: CheckCircle,
      label: 'GST Verified',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    msme: {
      icon: Shield,
      label: 'MSME Registered',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    iec: {
      icon: Globe,
      label: 'Export Ready',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  }

  const badge = badges[type]
  const Icon = badge.icon

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${badge.bgColor} ${badge.borderColor} ${className}`}>
      <Icon className={`w-4 h-4 ${badge.color}`} />
      <div className="flex flex-col">
        <span className={`text-xs font-semibold ${badge.color}`}>{badge.label}</span>
        <span className="text-xs text-gray-600 font-mono">{value}</span>
      </div>
    </div>
  )
}

interface CompanyInfoProps {
  businessName: string
  businessType: string
  gstin: string
  msmeNumber: string
  msmeCategory: string
  iecCode: string
  address: {
    line1: string
    line2: string
    city: string
    state: string
    pincode: string
    country: string
  }
  grievanceOfficer: {
    email: string
  }
  certificates?: {
    gstUrl?: string
    udyamUrl?: string
    iecUrl?: string
  }
}

export const TrustBox: React.FC<{ companyInfo: CompanyInfoProps }> = ({ companyInfo }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Legal & Compliance</h3>
      
      {/* Business Info */}
      <div className="space-y-1">
        <p className="text-sm text-gray-600">Registered as:</p>
        <p className="text-base font-semibold text-gray-900">{companyInfo.businessName}</p>
        <p className="text-sm text-gray-500">({companyInfo.businessType} - {companyInfo.msmeCategory})</p>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-3">
        <TrustBadge type="gst" value={companyInfo.gstin} />
        <TrustBadge type="msme" value={companyInfo.msmeNumber} />
        <TrustBadge type="iec" value={companyInfo.iecCode} />
      </div>

      {/* Verification Links */}
      {companyInfo.certificates && (
        <div className="flex flex-wrap gap-3 text-sm">
          {companyInfo.certificates.gstUrl && (
            <a 
              href={companyInfo.certificates.gstUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View GST Certificate
            </a>
          )}
          {companyInfo.certificates.udyamUrl && (
            <a 
              href={companyInfo.certificates.udyamUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View MSME Certificate
            </a>
          )}
          {companyInfo.certificates.iecUrl && (
            <a 
              href={companyInfo.certificates.iecUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View IEC Certificate
            </a>
          )}
        </div>
      )}

      {/* Address */}
      <div className="space-y-1 pt-3 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700">Registered Office:</p>
        <p className="text-sm text-gray-600">
          {companyInfo.address.line1}<br />
          {companyInfo.address.line2}<br />
          {companyInfo.address.city}, {companyInfo.address.state} {companyInfo.address.pincode}<br />
          {companyInfo.address.country}
        </p>
      </div>

      {/* Grievance Officer */}
      <div className="space-y-1 pt-3 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700">Grievance Officer:</p>
        <a 
          href={`mailto:${companyInfo.grievanceOfficer.email}`}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {companyInfo.grievanceOfficer.email}
        </a>
      </div>
    </div>
  )
}

export const CompactTrustBadges: React.FC<{ gstin: string; msme: string }> = ({ gstin, msme }) => {
  return (
    <div className="flex flex-wrap gap-2 items-center text-xs text-gray-600">
      <span className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-green-600" />
        <span className="font-mono">{gstin}</span>
      </span>
      <span className="text-gray-400">|</span>
      <span className="flex items-center gap-1">
        <Shield className="w-3 h-3 text-blue-600" />
        <span className="font-mono">{msme}</span>
      </span>
    </div>
  )
}
