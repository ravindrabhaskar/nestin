import React from 'react';
import { Icon } from './Icon';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  resetText?: string;
  iconName?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'Try adjusting your search criteria, clearing filters, or creating a new item.',
  onReset,
  resetText = 'Clear Filters',
  iconName = 'search',
  icon,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center max-w-md mx-auto my-6 space-y-4">
      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
        {icon || <Icon name={iconName} size={24} className="text-slate-400" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 font-heading">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      {onReset && (
        <div className="pt-2">
          <Button variant="outline" size="sm" leftIcon={<Icon name="refresh" size={14} />} onClick={onReset}>
            {resetText}
          </Button>
        </div>
      )}
    </div>
  );
};
