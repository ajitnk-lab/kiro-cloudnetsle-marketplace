import { Search, Book, MessageCircle, Phone } from 'lucide-react'

export function HelpCenter() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
        <p className="text-xl text-gray-600">Find answers to your questions and get support</p>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow p-6">
          <Book className="h-8 w-8 text-blue-600 mb-4" />
          <h3 className="text-xl font-semibold mb-4">Getting Started</h3>
          <ul className="space-y-2 text-gray-600">
            <li>• How to create an account</li>
            <li>• Browsing the marketplace</li>
            <li>• Making your first purchase</li>
            <li>• Setting up your profile</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <MessageCircle className="h-8 w-8 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold mb-4">For Partners</h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Applying for marketplace access</li>
            <li>• Adding your first solution</li>
            <li>• Managing your listings</li>
            <li>• Understanding commissions</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Phone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold mb-4">Need More Help?</h3>
        <p className="text-gray-600 mb-6">Can't find what you're looking for? Our support team is here to help.</p>
        <button className="btn-primary">Contact Support</button>
      </div>
    </div>
  )
}
