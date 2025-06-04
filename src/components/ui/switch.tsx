import * as React from "react";

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(event.target.checked);
      }
    };

    return (
      <div className={`inline-flex items-center ${className}`}>
        <label className="relative inline-block h-6 w-11">
          <input
            type="checkbox"
            className="peer h-0 w-0 opacity-0"
            ref={ref}
            checked={checked}
            onChange={handleChange}
            {...props}
          />
          <span className="absolute inset-0 cursor-pointer rounded-full bg-gray-300 transition-colors duration-200 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300"></span>
          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 peer-checked:translate-x-5"></span>
        </label>
      </div>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
