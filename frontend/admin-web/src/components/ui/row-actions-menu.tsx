import type { ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { EllipsisVertical, LoaderCircle } from "lucide-react";
import { cn } from "../../lib/utils";

type RowActionsMenuProps = {
  label: string;
  busy?: boolean;
  children: ReactNode;
};

type RowActionMenuItemProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  title?: string;
};

export function RowActionsMenu({ label, busy = false, children }: RowActionsMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        type="button"
        aria-label={label}
        className="inline-flex size-8 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60023]/30"
      >
        {busy
          ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          : <EllipsisVertical aria-hidden="true" className="size-4" />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4}>
          <Menu.Popup className="z-50 min-w-44 rounded-lg border border-gray-100 bg-white p-1 text-gray-700 shadow-lg">
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function RowActionMenuItem({
  children,
  onClick,
  disabled = false,
  destructive = false,
  title,
}: RowActionMenuItemProps) {
  return (
    <Menu.Item
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex w-full cursor-default select-none items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-gray-100",
        destructive && "text-red-700 data-[highlighted]:bg-red-50",
      )}
    >
      {children}
    </Menu.Item>
  );
}
