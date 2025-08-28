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
            "relative inline-flex h-7 w-12 items-center rounded-full border-2 transition-all duration-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background cursor-pointer shadow-sm hover:shadow-lg transform hover:scale-105",
            checked
              ? "bg-gradient-to-r from-primary to-primary/80 border-primary/20 shadow-lg"
              : "bg-gradient-to-r from-muted to-muted-foreground/20 border-muted-foreground/20 shadow-sm",
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
              "block h-5 w-5 rounded-full shadow-lg ring-0 transition-all duration-300 ease-in-out border-2 backdrop-blur-sm",
              checked
                ? "translate-x-5 bg-background border-primary/20 shadow-xl"
                : "translate-x-0.5 bg-background border-muted-foreground/30 shadow-md"
            )}
          />
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-800 hover:text-gray-700 transition-colors duration-200">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
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
