// Adapted from shadcn/ui base-nova Toggle Group (MIT). Tailwind variants are
// expressed in local CSS tokens to avoid introducing a second styling runtime.
import type { ReactNode } from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";

export function ToggleGroup({value,onValueChange,className="",children,...props}: Omit<ToggleGroupPrimitive.Props,"value"|"onValueChange"|"children"> & {value:string;onValueChange:(value:string)=>void;children:ReactNode}) {
  return <ToggleGroupPrimitive {...props} data-slot="toggle-group" className={`nova-toggle-group ${className}`} value={[value]} multiple={false} onValueChange={values=>{if(values[0])onValueChange(values[0]);}}>{children}</ToggleGroupPrimitive>;
}
export function ToggleGroupItem({className="",...props}:TogglePrimitive.Props) {
  return <TogglePrimitive {...props} data-slot="toggle-group-item" className={`nova-toggle ${className}`} />;
}
