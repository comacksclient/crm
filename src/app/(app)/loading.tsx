'use client';

export default function Loading() {
    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
            {/* Header Banner Skeleton */}
            <div className="h-20 bg-slate-200 dark:bg-slate-800/80 rounded-2xl w-full" />
            
            {/* KPI Cards Grid Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="h-28 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
                <div className="h-28 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
                <div className="h-28 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
                <div className="h-28 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
            </div>

            {/* Central Panel Skeleton */}
            <div className="h-64 bg-slate-200 dark:bg-slate-800/80 rounded-2xl w-full" />

            {/* Content Split Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
                <div className="h-96 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
            </div>
        </div>
    );
}
