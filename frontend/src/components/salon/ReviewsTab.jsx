import React from 'react';
import { Star, MessageSquare } from 'lucide-react';

export default function ReviewsTab({
  reviews = [],
  overallRating = 0,
  totalReviews = 0,
}) {
  // Compute star breakdown
  const distribution = reviews.reduce((acc, r) => {
    const star = Math.min(Math.max(Math.round(r.rating || 5), 1), 5);
    acc[star] = (acc[star] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-5 font-sans">
      {/* Top Banner: Aggregate Score & Distribution */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Rating Score */}
          <div className="text-center sm:text-left shrink-0">
            <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
              {Number(overallRating || 0).toFixed(1)}
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-1 text-amber-400 my-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  className={
                    s <= Math.round(overallRating || 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-slate-100 text-slate-200'
                  }
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Based on {totalReviews || reviews.length} verified ratings
            </p>
          </div>

          {/* Progress Bars for Stars */}
          <div className="flex-1 w-full space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 font-mono font-medium text-slate-500 text-right">
                    {star}★
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 font-mono text-slate-400 text-right text-[11px]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
          Customer Reviews
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          {reviews.length} Verified Experience{reviews.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center text-slate-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-40 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">No reviews found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified customer reviews will appear here after service completion.
            </p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {rev.customerName ? rev.customerName[0]?.toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                      {rev.customerName || 'Customer'}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {rev.createdAt
                        ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recent'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      className={
                        s <= Math.round(rev.rating || 5)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-100 text-slate-200'
                      }
                    />
                  ))}
                </div>
              </div>

              {rev.comment && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                  {rev.comment}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
