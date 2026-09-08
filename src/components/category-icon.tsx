import {
  Baby, Bike, Briefcase, Car, Dog, Home, Laptop, Shirt, Sofa, Tag, Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  car: Car,
  home: Home,
  laptop: Laptop,
  sofa: Sofa,
  shirt: Shirt,
  bike: Bike,
  baby: Baby,
  dog: Dog,
  wrench: Wrench,
  briefcase: Briefcase,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Tag;
  return <Icon className={className} />;
}
