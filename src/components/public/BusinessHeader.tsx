import Link from 'next/link'
import type { Business, Review } from '@/types'

interface BusinessHeaderProps {
  business: Business
  reviews: Review[]
  slug: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`h-4 w-4 ${s <= rating ? 'text-amber-400' : 'text-zinc-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export function BusinessHeader({ business, reviews, slug }: BusinessHeaderProps) {
  const avgRating = reviews.length
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="relative">
      <div className="h-48 w-full bg-gradient-to-br from-emerald-900/40 to-zinc-900 rounded-xl mb-0" />
      <div className="px-4 pb-6 pt-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">{business.name}</h1>
            {business.description && (
              <p className="text-zinc-400 mt-1 max-w-xl">{business.description}</p>
            )}
            {business.address && (
              <p className="flex items-center gap-1.5 text-sm text-zinc-500 mt-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {business.address}
              </p>
            )}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={Math.round(avgRating)} />
                <span className="text-sm text-zinc-400">
                  {avgRating.toFixed(1)} ({reviews.length} avaliações)
                </span>
              </div>
            )}
          </div>

          <Link
            href={`/b/${slug}/book`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 font-medium transition-colors shadow-lg shadow-emerald-500/25"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Reservar agora
          </Link>
        </div>
      </div>
    </div>
  )
}
