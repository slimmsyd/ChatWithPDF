
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-empty-interface */

import React from 'react';

export interface PDFIconProps extends React.SVGProps<SVGSVGElement> {}

export const PDFIcon: React.FC<PDFIconProps> = (props) => {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M10 12h1v4" />
      <path d="M14 12h1v4" />
      <path d="M8 12h2" />
      <path d="M12 12h2" />
    </svg>
  );
} 