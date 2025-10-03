import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary',
  className = '',
  variant = 'spinner' // spinner, dots, pulse, bars
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse ${className}`}></div>
        );
      
      case 'bars':
        return (
          <div className={`flex space-x-1 items-end ${className}`}>
            <div className={`w-1 ${colorClasses[color]} animate-pulse`} style={{ height: '16px', animationDelay: '0ms' }}></div>
            <div className={`w-1 ${colorClasses[color]} animate-pulse`} style={{ height: '24px', animationDelay: '150ms' }}></div>
            <div className={`w-1 ${colorClasses[color]} animate-pulse`} style={{ height: '20px', animationDelay: '300ms' }}></div>
            <div className={`w-1 ${colorClasses[color]} animate-pulse`} style={{ height: '28px', animationDelay: '450ms' }}></div>
          </div>
        );
      
      case 'spinner':
      default:
        return (
          <Loader2 className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin ${className}`} />
        );
    }
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      {renderSpinner()}
    </div>
  );
};

export default LoadingSpinner;

