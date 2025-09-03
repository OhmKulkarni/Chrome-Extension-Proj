import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child as any, {
              value,
              onValueChange,
              isOpen,
              setIsOpen
            })
          : child
      )}
    </div>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps & any> = ({
  className = '',
  children,
  isOpen,
  setIsOpen
}) => {
  return (
    <button
      className={`flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <ChevronDown className="h-4 w-4 text-gray-400" />
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps & any> = ({
  placeholder,
  value
}) => {
  return (
    <span className="text-sm">
      {value || placeholder}
    </span>
  );
};

export const SelectContent: React.FC<SelectContentProps & any> = ({
  children,
  isOpen,
  onValueChange,
  setIsOpen
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10">
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child as any, {
              onValueChange,
              setIsOpen
            })
          : child
      )}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps & any> = ({
  value,
  children,
  onValueChange,
  setIsOpen
}) => {
  return (
    <div
      className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
      onClick={() => {
        onValueChange(value);
        setIsOpen(false);
      }}
    >
      {children}
    </div>
  );
};
