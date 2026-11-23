import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#181E2A] via-[#1E2533] to-[#0f131c] border border-white/10 text-center p-6 ${className}`}
      >
        <Dumbbell className="w-10 h-10 text-[#E2F124] mb-3" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">{fallbackTitle || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
