import { Users, Target, Award, Globe } from 'lucide-react'

export function AboutUs() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About Us</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          We're building the future of software commerce by connecting innovative solution providers with businesses that need them.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-3xl font-semibold mb-6">Our Mission</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            To democratize access to business software by creating a trusted marketplace where innovative solutions meet real business needs. 
            We believe every business, regardless of size, should have access to the tools they need to succeed.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            Our platform empowers software creators to reach new markets while helping businesses discover and implement 
            solutions that drive growth and efficiency.
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-8">
          <h3 className="text-2xl font-semibold mb-6">Our Values</h3>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <Award className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold">Quality First</h4>
                <p className="text-gray-600">We curate only the best solutions for our marketplace</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <Users className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold">Community Driven</h4>
                <p className="text-gray-600">Our success is built on the success of our partners</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <Globe className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold">Global Impact</h4>
                <p className="text-gray-600">Connecting solutions worldwide to solve real problems</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-8 mb-16">
        <div className="text-center">
          <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold mb-4">Our Vision</h3>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            To become the world's most trusted marketplace for business software, where innovation meets opportunity 
            and every business can find the perfect solution for their unique challenges.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div>
          <div className="text-3xl font-bold text-blue-600 mb-2">10,000+</div>
          <div className="text-gray-600">Solutions Available</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-blue-600 mb-2">5,000+</div>
          <div className="text-gray-600">Trusted Partners</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
          <div className="text-gray-600">Countries Served</div>
        </div>
      </div>
    </div>
  )
}
