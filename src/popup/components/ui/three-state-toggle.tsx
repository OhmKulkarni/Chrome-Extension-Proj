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
            container: "bg-gradient-to-r from-green-500 to-green-600 border-green-400/30 shadow-lg ring-1 ring-green-200",
            thumb: "translate-x-5 bg-white border-green-300/50 shadow-xl ring-1 ring-green-100",
            indicator: "bg-green-500"
          };
        case 'mixed':
          return {
            container: "bg-gradient-to-r from-yellow-500 to-amber-500 border-yellow-400/30 shadow-lg ring-1 ring-yellow-200",
            thumb: "translate-x-2.5 bg-white border-yellow-300/50 shadow-xl ring-1 ring-yellow-100",
            indicator: "bg-yellow-500"
          };
        case 'off':
        default:
          return {
            container: "bg-gradient-to-r from-slate-300 to-slate-400 border-slate-400/30 shadow-sm",
            thumb: "translate-x-0.5 bg-white border-slate-300/50 shadow-md",
            indicator: "bg-red-500"
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
            "relative inline-flex h-7 w-12 items-center rounded-full border transition-all duration-500 ease-in-out focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105",
            styles.container,
            className
          )}
          onClick={handleClick}
          title={`Click to ${state === 'off' ? 'enable all' : 'disable all'} logging features`}
        >
          <span
            className={cn(
              "block h-5 w-5 rounded-full shadow-lg ring-0 transition-all duration-500 ease-in-out border flex items-center justify-center backdrop-blur-sm",
              styles.thumb
            )}
          >
            <div className={`w-2 h-2 rounded-full ${styles.indicator} shadow-sm`}></div>
          </span>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label className="text-sm font-semibold leading-none cursor-pointer text-gray-800 hover:text-gray-700 transition-colors duration-200" onClick={handleClick}>
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
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
