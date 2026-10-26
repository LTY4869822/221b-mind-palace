// shadcn/ui Nova composition, backed by the same Base UI primitive family.
import { Button as ButtonPrimitive } from "@base-ui/react/button";
export function Button({className="",variant="outline",...props}:ButtonPrimitive.Props & {variant?:"outline"|"ghost"|"default"}) {
  return <ButtonPrimitive {...props} data-slot="button" data-variant={variant} className={`nova-button ${className}`} />;
}
