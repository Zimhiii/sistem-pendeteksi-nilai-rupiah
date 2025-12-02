import { icons } from "lucide-react-native";
import React from "react";

type PropsIcon = { name: string; color?: string; size: number };

const Icon = ({ name, color = "#000000", size }: PropsIcon) => {
  const LucideIcon = (icons as Record<string, any>)[name];

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react-native`);
    return null;
  }

  return <LucideIcon color={color} size={size} />;
};

export default Icon;
