import type { Review } from '@/types'
import { formatDate } from '@/lib/utils'

interface ReviewsListProps {
  reviews: Review[]
  primaryColor?: string
}

export function ReviewsList({ reviews, primaryColor = '#10b981' }: ReviewsListProps) {
  if (reviews.length === 0) return null

  const avg = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-zinc-100" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
        Avaliacoes
      </h2>

      <div
        className="mb-4 rounded-2xl border p-5 text-center"
        style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}4d` }}
      >
        <div className="mb-1 flex items-center justify-center gap-1">
          <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{avg}</span>
          <span className="text-xl" style={{ color: primaryColor }}>★</span>
        </div>
        <div className="text-xs text-zinc-400">Baseado em {reviews.length} avaliacoes</div>
      </div>

      <div className="space-y-3">
        {reviews.slice(0, 6).map((review) => (
          <div key={review.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ backgroundColor: `${primaryColor}1f`, color: primaryColor }}
              >
                {review.client_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100">{review.client_name}</span>
                  <span className="text-xs" style={{ color: primaryColor }}>{'★'.repeat(review.rating)}</span>
                </div>
                {review.comment && <p className="mb-1.5 text-sm leading-relaxed text-zinc-300">{review.comment}</p>}
                <span className="text-xs text-zinc-500">{formatDate(review.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
