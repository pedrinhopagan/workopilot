import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

interface CustomSelectProps<T extends { id: string }> {
  items: T[]
  value?: string
  onValueChange: (value: string, item: T) => void
  renderItem: (item: T, isSelected: boolean) => React.ReactNode
  renderTrigger?: () => React.ReactNode
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
}

function CustomSelect<T extends { id: string }>({
  items,
  value,
  onValueChange,
  renderItem,
  renderTrigger,
  label,
  placeholder = "Selecione...",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  align = "start",
  side = "bottom",
}: CustomSelectProps<T>) {
  function handleValueChange(newValue: string) {
    const item = items.find((i) => i.id === newValue)
    if (item) {
      onValueChange(newValue, item)
    }
  }

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        data-slot="custom-select-trigger"
        className={cn(
          "flex items-center justify-between gap-2 whitespace-nowrap transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName
        )}
      >
        {renderTrigger ? (
          renderTrigger()
        ) : (
          <>
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown className="size-4 opacity-50" />
            </SelectPrimitive.Icon>
          </>
        )}
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          data-slot="custom-select-content"
          position="popper"
          align={align}
          side={side}
          sideOffset={8}
          className={cn(
            "bg-card border border-border shadow-xl z-50 overflow-hidden animate-slide-down",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
            className,
            contentClassName
          )}
        >
          {label && (
            <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              {label}
            </div>
          )}

          <CustomSelectScrollUpButton />

          <SelectPrimitive.Viewport className="max-h-48 overflow-y-auto">
            {items.map((item) => (
              <SelectPrimitive.Item
                key={item.id}
                value={item.id}
                data-slot="custom-select-item"
                className="outline-none cursor-pointer data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <SelectPrimitive.ItemText asChild>
                  <div>{renderItem(item, value === item.id)}</div>
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <CustomSelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

function CustomSelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn(
        "flex cursor-default items-center justify-center py-1 bg-card border-b border-border",
        className
      )}
      {...props}
    >
      <ChevronUp className="size-4 text-muted-foreground" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function CustomSelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn(
        "flex cursor-default items-center justify-center py-1 bg-card border-t border-border",
        className
      )}
      {...props}
    >
      <ChevronDown className="size-4 text-muted-foreground" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export { CustomSelect }
export type { CustomSelectProps }
