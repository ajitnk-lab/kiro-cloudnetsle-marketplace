export function ContactUs() {
  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-xl text-gray-600">Get in touch with our team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>
          <form action="https://formspree.io/f/movpzgqa" method="POST" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" name="firstName" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" name="lastName" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" name="email" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input type="text" name="subject" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea rows={6} name="message" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <button type="submit" className="btn-primary w-full">Send Message</button>
          </form>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-6">Get in touch</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CloudNestle Consulting & Services</h3>
              
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">🇺🇸 US Sales & Support:</p>
                  <p>
                    <span className="font-medium">Sales:</span>{' '}
                    <a href="mailto:sales@cloudnestle.com" className="text-blue-600 hover:text-blue-800">
                      sales@cloudnestle.com
                    </a>
                  </p>
                  <p>
                    <span className="font-medium">Support:</span>{' '}
                    <a href="mailto:support@cloudnestle.com" className="text-blue-600 hover:text-blue-800">
                      support@cloudnestle.com
                    </a>
                  </p>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-900 mb-1">📍 Global Headquarters:</p>
                  <p className="leading-relaxed">
                    🇮🇳 Ground floor, #85, 2nd Cross Road,<br />
                    Central Excise Layout, Vijay Nagar,<br />
                    Bangalore 560040, India
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
