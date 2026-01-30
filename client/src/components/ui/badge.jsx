import React from "react";
import { cn } from "../../lib/utils";

function Badge({ className, variant = "default", ...props }) {
    const variants = {
        default: "border-transparent bg-primary-600 text-white shadow hover:bg-primary-600/80",
        secondary: "border-transparent bg-dark-700 text-gray-300 hover:bg-dark-700/80",
        outline: "text-white border-dark-700",
    };

    return (
        <div className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2", variants[variant], className)} {...props} />
    );
}

export { Badge };
