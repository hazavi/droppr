import {
  ShoppingBag, ShoppingCart, Tag, Gift, Gem, Crown, Watch,
  Laptop, Smartphone, Headphones, Camera, Gamepad2,
  Shirt, Footprints, Glasses,
  Sparkles, Heart, Leaf, FlaskConical,
  Home, BookOpen, UtensilsCrossed, Coffee,
  Dumbbell, Plane, Music, Bike, Zap, FolderOpen,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ItemList } from "@/types"

export const LIST_ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: "ShoppingBag", Icon: ShoppingBag },
  { name: "ShoppingCart", Icon: ShoppingCart },
  { name: "Tag", Icon: Tag },
  { name: "Gift", Icon: Gift },
  { name: "Gem", Icon: Gem },
  { name: "Crown", Icon: Crown },
  { name: "Watch", Icon: Watch },
  { name: "Laptop", Icon: Laptop },
  { name: "Smartphone", Icon: Smartphone },
  { name: "Headphones", Icon: Headphones },
  { name: "Camera", Icon: Camera },
  { name: "Gamepad2", Icon: Gamepad2 },
  { name: "Shirt", Icon: Shirt },
  { name: "Footprints", Icon: Footprints },
  { name: "Glasses", Icon: Glasses },
  { name: "Sparkles", Icon: Sparkles },
  { name: "Heart", Icon: Heart },
  { name: "Leaf", Icon: Leaf },
  { name: "FlaskConical", Icon: FlaskConical },
  { name: "Home", Icon: Home },
  { name: "BookOpen", Icon: BookOpen },
  { name: "UtensilsCrossed", Icon: UtensilsCrossed },
  { name: "Coffee", Icon: Coffee },
  { name: "Dumbbell", Icon: Dumbbell },
  { name: "Plane", Icon: Plane },
  { name: "Music", Icon: Music },
  { name: "Bike", Icon: Bike },
  { name: "Zap", Icon: Zap },
  { name: "FolderOpen", Icon: FolderOpen },
]

export const LIST_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  LIST_ICONS.map(({ name, Icon }) => [name, Icon])
)

interface ListIconDisplayProps {
  list: Pick<ItemList, "icon" | "iconType">
  className?: string
}

export function ListIconDisplay({
  list,
  className = "h-5 w-5 text-slate-500",
}: ListIconDisplayProps) {
  if (list.iconType === "emoji" && list.icon) {
    return <span className="text-2xl leading-none">{list.icon}</span>
  }
  if (list.iconType === "icon" && list.icon && LIST_ICON_MAP[list.icon]) {
    const Icon = LIST_ICON_MAP[list.icon]
    return <Icon className={className} />
  }
  return <FolderOpen className={className} />
}
