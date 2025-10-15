import { Calendar, User, ArrowRight } from 'lucide-react'

export function Blog() {
  const posts = [
    {
      id: 1,
      title: "The Future of Business Software Marketplaces",
      excerpt: "Exploring how digital marketplaces are transforming the way businesses discover and adopt new software solutions.",
      author: "Sarah Johnson",
      date: "October 12, 2025",
      category: "Industry Insights",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop"
    },
    {
      id: 2,
      title: "5 Tips for Successful Partner Onboarding",
      excerpt: "Learn the best practices for getting your software solutions approved and featured on our marketplace.",
      author: "Mike Chen",
      date: "October 10, 2025",
      category: "Partner Success",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop"
    },
    {
      id: 3,
      title: "Security Best Practices for SaaS Solutions",
      excerpt: "Essential security measures every software provider should implement to protect their customers' data.",
      author: "Emily Rodriguez",
      date: "October 8, 2025",
      category: "Security",
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=250&fit=crop"
    },
    {
      id: 4,
      title: "Marketplace Trends: What's Coming in 2026",
      excerpt: "A look ahead at the emerging trends that will shape the software marketplace landscape next year.",
      author: "David Park",
      date: "October 5, 2025",
      category: "Trends",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop"
    }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
        <p className="text-xl text-gray-600">Insights, tips, and updates from the marketplace</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {posts.map((post) => (
          <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <img 
              src={post.image} 
              alt={post.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <div className="flex items-center text-sm text-gray-500 mb-3">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {post.category}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer">
                {post.title}
              </h2>
              <p className="text-gray-600 mb-4 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <User className="h-4 w-4 mr-1" />
                  <span className="mr-4">{post.author}</span>
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{post.date}</span>
                </div>
                <button className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium">
                  Read More
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="text-center mt-12">
        <button className="btn-outline">Load More Posts</button>
      </div>

      <div className="bg-gray-50 rounded-lg p-8 mt-12 text-center">
        <h3 className="text-2xl font-semibold mb-4">Stay Updated</h3>
        <p className="text-gray-600 mb-6">Subscribe to our newsletter for the latest insights and updates</p>
        <div className="flex max-w-md mx-auto">
          <input 
            type="email" 
            placeholder="Enter your email"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-blue-600 text-white px-6 py-2 rounded-r-md hover:bg-blue-700">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  )
}
