import type { Review } from '@/types'
import { formatDate } from '@/lib/utils'

interface ReviewsListProps {
  reviews: Review[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) return null

  const avg = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-100 mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Avaliações</h2>

      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-2xl p-5 mb-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{avg}</span>
          <span className="text-emerald-400 text-xl">⭐</span>
        </div>
        <div className="text-xs text-zinc-400">Baseado em {reviews.length} avaliações</div>
      </div>

      <div className="space-y-3">
        {reviews.slice(0, 6).map((review) => (
          <div key={review.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                {review.client_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-zinc-100">{review.client_name}</span>
                  <span className="text-xs">{'⭐'.repeat(review.rating)}</span>
                </div>
                {review.comment && <p className="text-sm text-zinc-300 mb-1.5 leading-relaxed">{review.comment}</p>}
                <span className="text-xs text-zinc-500">{formatDate(review.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
