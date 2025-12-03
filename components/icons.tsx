import React from 'react';

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const XCircleIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const AcademicCapIcon: React.FC<{ className?: string }> = ({ className = 'h-16 w-16' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path d="M12 14.25c-2.093 0-4.135-1.02-5.5-2.813.394-.083.804-.137 1.23-.137 2.136 0 4.103 1.05 5.5 2.813-.402.078-.82.122-1.23.122z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25A5.25 5.25 0 0017.25 9v-2.257a4.5 4.5 0 00-4.5-4.5h-1.5a4.5 4.5 0 00-4.5 4.5v2.257A5.25 5.25 0 0012 14.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25a2.25 2.25 0 01-2.25-2.25v-2.505a2.25 2.25 0 014.5 0v2.505A2.25 2.25 0 0112 14.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 19.5v-2.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 17.25v2.25m18 0a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 19.5m18 0v-2.25" />
    </svg>
);

export const ArrowRightIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
    </svg>
);

export const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18" />
    </svg>
);

export const MenuIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

export const XIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const ExclamationCircleIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
  </svg>
);