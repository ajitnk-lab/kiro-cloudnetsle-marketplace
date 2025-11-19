interface BackgroundImageProps {
  opacity?: number
  overlay?: string
}

export function BackgroundImage({ 
  opacity = 60, 
  overlay = "bg-gradient-to-br from-blue-50/60 to-white/60" 
}: BackgroundImageProps) {
  return (
    <>
      {/* Background Image */}
      <div className="fixed inset-0 -z-10" style={{ opacity: opacity / 100 }}>
        <img 
          src="/homepage-image.png" 
          alt="Marketplace Background" 
          className="w-full h-full object-cover"
        />
      </div>
      {/* Overlay */}
      <div className={`fixed inset-0 -z-10 ${overlay}`}></div>
    </>
  )
}
