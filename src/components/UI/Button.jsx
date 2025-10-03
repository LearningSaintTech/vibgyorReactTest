import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  icon = null,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:scale-105 active:scale-95';
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-soft hover:shadow-medium',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500 shadow-soft hover:shadow-medium',
    outline: 'border-2 border-primary-600 bg-transparent text-primary-600 hover:bg-primary-600 hover:text-white focus:ring-primary-500 shadow-soft hover:shadow-medium',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-soft hover:shadow-medium',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-soft hover:shadow-medium',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 shadow-soft hover:shadow-medium',
    gradient: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 focus:ring-primary-500 shadow-soft hover:shadow-medium'
  };
  
  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1',
    small: 'px-3 py-1.5 text-sm gap-1.5',
    medium: 'px-4 py-2.5 text-base gap-2',
    large: 'px-6 py-3 text-lg gap-2.5',
    xl: 'px-8 py-4 text-xl gap-3'
  };
  
  const iconSizes = {
    xs: 'w-3 h-3',
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
    xl: 'w-7 h-7'
  };
  
  const classes = `
    ${baseClasses} 
    ${variants[variant]} 
    ${sizes[size]} 
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();
  
  const iconClass = iconSizes[size];
  const isDisabled = disabled || loading;
  
  const renderIcon = () => {
    if (loading) {
      return <Loader2 className={`${iconClass} animate-spin`} />;
    }
    if (icon) {
      return React.cloneElement(icon, { className: iconClass });
    }
    return null;
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <>
          {renderIcon()}
          {children}
        </>
      );
    }
    
    if (icon && iconPosition === 'left') {
      return (
        <>
          {renderIcon()}
          {children}
        </>
      );
    }
    
    if (icon && iconPosition === 'right') {
      return (
        <>
          {children}
          {renderIcon()}
        </>
      );
    }
    
    return children;
  };
  
  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      onClick={onClick}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default Button;

