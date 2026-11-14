import type { ReactElement } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "../../lib/utils";

type TruncatedTextProps = {
  text: string;
  className?: string;
  render?: ReactElement;
};

export function TruncatedText({ text, className, render }: TruncatedTextProps) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={render ?? <span tabIndex={0} />}
          className={cn(
            "block min-w-0 truncate text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60023]/40",
            className,
          )}
          aria-label={text}
        >
          {text}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" sideOffset={6}>
            <Tooltip.Popup className="z-50 max-w-[calc(100vw-2rem)] break-words rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
              {text}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
