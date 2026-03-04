
import React from 'react';
import { RATING_SCALE } from '../../constants';

interface Props {
  competencyName: string;
  description: string;
  behaviors: string[];
  rating: number;
  comment: string;
  onRatingChange?: (rating: number) => void;
  onCommentChange?: (comment: string) => void;
  readOnly?: boolean;
  label?: string;
}

const CompetencyRatingCard: React.FC<Props> = ({
  competencyName,
  description,
  behaviors,
  rating,
  comment,
  onRatingChange,
  onCommentChange,
  readOnly = false,
  label,
}) => {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-slate-900">{competencyName}</h4>
          {label && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {label}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{description}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {behaviors.map((b, i) => (
            <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Rating Selector */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">Rating</p>
        <div className="flex gap-2">
          {RATING_SCALE.map(scale => (
            <button
              key={scale.value}
              type="button"
              disabled={readOnly}
              onClick={() => onRatingChange?.(scale.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                rating === scale.value
                  ? `${scale.color} text-white shadow-sm`
                  : readOnly
                  ? 'bg-slate-50 text-slate-400'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
              title={scale.label}
            >
              {scale.value}
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-[10px] text-slate-400 mt-1">
            {RATING_SCALE.find(s => s.value === rating)?.label}
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1">Comment</p>
        {readOnly ? (
          <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 min-h-[2.5rem]">
            {comment || <span className="text-slate-400 italic">No comment</span>}
          </p>
        ) : (
          <textarea
            value={comment}
            onChange={e => onCommentChange?.(e.target.value)}
            placeholder="Add your observations..."
            className="w-full text-sm border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={2}
          />
        )}
      </div>
    </div>
  );
};

export default CompetencyRatingCard;
