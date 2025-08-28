import * as React from "react"
import { cn } from "../../lib/utils"

export type ThreeState = 'off' | 'mixed' | 'on';

export interface ThreeStateToggleProps {
  state: ThreeState
  onStateChange: (newState: ThreeState) => void
  label?: string
  description?: string
  className?: string
}

const ThreeStateToggle = React.forwardRef<HTMLDivElement, ThreeStateToggleProps>(
  ({ className, label, description, state, onStateChange }, ref) => {
    const handleClick = () => {
      // Cycle through states: off → on → off (skip mixed, as mixed is auto-determined)
      // Mixed state is only set programmatically, not by user clicks
      const nextState: ThreeState = state === 'off' ? 'on' : 'off';
      onStateChange(nextState);
    };

    const getToggleStyles = () => {
      switch (state) {
        case 'on':
          return {
            container: "bg-green-500 border-green-400/30 shadow-md",
            thumb: "translate-x-5 bg-white border-green-400/20 shadow-lg",
            icon: "🟢"
          };
        case 'mixed':
          return {
            container: "bg-yellow-500 border-yellow-400/30 shadow-md",
            thumb: "translate-x-2.5 bg-white border-yellow-400/20 shadow-lg",
            icon: "🟡"
          };
        case 'off':
        default:
          return {
            container: "bg-gray-300 border-gray-400/30",
            thumb: "translate-x-0.5 bg-white border-gray-400/30",
            icon: "🔴"
          };
      }
    };

    const styles = getToggleStyles();

    const getStateDescription = () => {
      switch (state) {
        case 'on':
          return 'All logging features enabled';
        case 'mixed':
          return 'Some logging features enabled';
        case 'off':
          return 'All logging features disabled';
      }
    };

    return (
      <div className="flex items-start space-x-3">
        <div 
          ref={ref}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-all duration-300 ease-in-out focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background cursor-pointer shadow-sm",
            styles.container,
            className
          )}
          onClick={handleClick}
          title={`Click to ${state === 'off' ? 'enable all' : 'disable all'} logging features`}
        >
          <span
            className={cn(
              "block h-4 w-4 rounded-full shadow-lg ring-0 transition-all duration-300 ease-in-out border flex items-center justify-center text-xs",
              styles.thumb
            )}
          >
            <span className="text-[8px]" style={{ lineHeight: '8px' }}>
              {styles.icon}
            </span>
          </span>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label className="text-sm font-medium leading-none cursor-pointer" onClick={handleClick}>
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description || getStateDescription()}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
ThreeStateToggle.displayName = "ThreeStateToggle"

export { ThreeStateToggle }
