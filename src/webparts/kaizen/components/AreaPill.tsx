import * as React from 'react';
import { AreaColors, areaColor } from '../ideas/areaColors';

export interface IAreaPillProps {
  area: string;
  colors: AreaColors;
  /** The pill's shape and its look with no colour. */
  className: string;
}

/* An idea's area as a pill, in the colour picked for it on the Areas page. */
const AreaPill: React.FC<IAreaPillProps> = ({ area, colors, className }) => {
  const color = areaColor(colors[area]);
  return (
    <span className={className} style={color ? { background: color.background, color: color.text } : undefined}>
      {area}
    </span>
  );
};

export default AreaPill;
