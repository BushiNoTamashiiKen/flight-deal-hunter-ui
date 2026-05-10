import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-card/45 px-2.5 py-1 text-base shadow-[inset_0_1px_1.5px_rgb(160_204_255/0.07)] transition-[color,box-shadow,border-color] duration-300 ease-spring outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-accent/35 focus-visible:border-accent/55 focus-visible:ring-[3px] focus-visible:ring-accent/22 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/35 dark:shadow-[inset_0_1px_2px_rgb(80_130_200/0.12)] dark:hover:border-accent/45 dark:focus-visible:border-accent/60 dark:focus-visible:ring-accent/28 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
