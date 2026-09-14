import React from 'react';
import { getShiftIconComponent } from '../utils/shiftIcons';

export interface ShiftIconProps extends React.ComponentPropsWithoutRef<'svg'> {
  icon?: string;
  type?: 'WORK' | 'REST';
  name?: string;
  className?: string;
}

export const ShiftIcon: React.FC<ShiftIconProps> = ({
  icon,
  type,
  name,
  className = 'w-4 h-4',
  ...props
}) => {
  const IconComponent = getShiftIconComponent(icon, type, name);
  return <IconComponent className={className} {...props} />;
};

export default ShiftIcon;
