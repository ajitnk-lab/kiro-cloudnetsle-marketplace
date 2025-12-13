import { Users, Target, Award, Globe } from 'lucide-react'

export function AboutUs() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About CloudNestle Marketplace</h1>
        <p className="text-2xl text-blue-600 font-semibold mb-8">
          Where Your Business Finds Its Cloud Home
        </p>
      </div>

      {/* What is the Marketplace */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 mb-12">
        <h2 className="text-3xl font-semibold mb-4 text-gray-900">What is CloudNestle Marketplace?</h2>
        <p className="text-lg text-gray-700 leading-relaxed mb-4">
          CloudNestle Marketplace is a platform that connects businesses with vetted cloud solutions, expert services, and trusted partners. We make it easy to discover, evaluate, and implement cloud solutions that drive your business forward.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed mb-4">
          We offer products and solutions built in-house and by our trusted partners.
        </p>
        <div className="text-center">
          <a 
            href="/catalog" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Browse Catalog & Make a Purchase
          </a>
        </div>
      </div>

      {/* Behind the Platform */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-12">
        <h2 className="text-3xl font-semibold mb-4 text-gray-900">Behind the Platform</h2>
        <p className="text-lg text-gray-700 leading-relaxed mb-6">
          Built and operated by <span className="font-semibold text-blue-600">CloudNestle Consulting & Services</span>, a cloud consulting company specializing in AWS solutions and digital transformation.
        </p>
        <div className="bg-gray-50 border-l-4 border-blue-600 p-4">
          <p className="text-sm text-gray-600 font-semibold mb-1">Legal Business Name</p>
          <p className="text-base text-gray-800">CloudNestle Consulting & Services</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-3xl font-semibold mb-6">Meet the Founder</h2>
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-2xl font-semibold mb-4">Ajit Nijagal Kamalakantha</h3>
            <p className="text-gray-700 text-lg leading-relaxed">
              "After years of seeing businesses struggle with their AWS architecture, I founded Cloud Nestle to provide expert, personalized guidance that helps companies of all sizes succeed in the cloud"
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-semibold mb-6">The CloudNestle Consulting & Services Story</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            CloudNestle Consulting & Services was born from a vision to help businesses find their perfect cloud home. We understand that every business has unique needs, and we're here to provide expert guidance to help you succeed in the cloud.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            CloudNestle Consulting & Services operates this marketplace platform to empower businesses to discover and implement cloud solutions that drive growth and efficiency, while connecting them with trusted partners and expert services.
          </p>
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-3xl font-semibold mb-8 text-center">Awards and Achievements</h2>
        <p className="text-center text-lg text-gray-600 mb-8">AWS Certified Expert with proven expertise across multiple domains</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center bg-white p-6 rounded-lg shadow-sm border">
            <Award className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">AWS Solutions Architect Associate</h3>
            <p className="text-gray-600 text-sm">Certified expertise in designing distributed systems on AWS</p>
          </div>
          <div className="text-center bg-white p-6 rounded-lg shadow-sm border">
            <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">AWS Well-Architected Professional</h3>
            <p className="text-gray-600 text-sm">Expert in AWS Well-Architected Framework principles</p>
          </div>
          <div className="text-center bg-white p-6 rounded-lg shadow-sm border">
            <Globe className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">AWS Cloud Economics</h3>
            <p className="text-gray-600 text-sm">Specialized in cloud cost optimization and economics</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-8 mb-16">
        <div className="text-center">
          <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold mb-4">Professional Endorsements</h3>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            What industry professionals say about our expertise: Our work is backed by professional recommendations and proven results in AWS consulting and cloud migration services.
          </p>
        </div>
      </div>

      {/* CloudNestle website link hidden for payment gateway compliance */}
    </div>
  )
}
