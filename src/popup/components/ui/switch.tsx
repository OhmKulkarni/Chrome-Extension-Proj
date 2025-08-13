import * as React from "react"
import { cn } from "../../lib/utils"

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  description?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, checked, onChange, ...props }, ref) => {
    const handleClick = () => {
      if (onChange) {
        // Create a synthetic event to match the expected type
        const syntheticEvent = {
          target: { checked: !checked },
          currentTarget: { checked: !checked }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="flex items-start space-x-3">
        <div 
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background cursor-pointer shadow-sm",
            checked 
              ? "bg-primary border-primary/20 shadow-md" 
              : "bg-muted border-muted-foreground/20",
            className
          )}
          onClick={handleClick}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={onChange}
            ref={ref}
            {...props}
          />
          <span
            className={cn(
              "block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out border",
              checked 
                ? "translate-x-5 bg-background border-primary/20 shadow-lg" 
                : "translate-x-0.5 bg-background border-muted-foreground/30"
            )}
          />
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
