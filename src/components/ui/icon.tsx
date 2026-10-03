import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { useTheme } from '../../theme/ThemeProvider';

export type IconName =
  | 'home'
  | 'alarm'
  | 'bell'
  | 'check-circle'
  | 'settings'
  | 'plus'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'close'
  | 'trash'
  | 'edit'
  | 'play'
  | 'pause'
  | 'volume'
  | 'volume-off'
  | 'shake'
  | 'sun'
  | 'moon'
  | 'zap'
  | 'calendar'
  | 'check'
  | 'lock'
  | 'crown'
  | 'refresh'
  | 'clock'
  | 'info'
  | 'skip'
  | 'activity'
  | 'shield'
  | 'sparkles'
  | 'star'
  | 'menu'
  | 'power'
  | 'arrow-up-right'
  | 'repeat'
  | 'flag'
  | 'gauge';

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color, strokeWidth = 1.9 }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, common, stroke)}
    </Svg>
  );
}

function renderPaths(name: IconName, common: Record<string, unknown>, stroke: string) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path {...common} d="M3 10.5 12 3l9 7.5" />
          <Path {...common} d="M5.5 9.6V20a1 1 0 0 0 1 1H10v-5.5h4V21h3.5a1 1 0 0 0 1-1V9.6" />
        </>
      );
    case 'alarm':
      return (
        <>
          <Circle {...common} cx="12" cy="13" r="8" />
          <Path {...common} d="M12 9.5V13l2.4 2.4" />
          <Path {...common} d="M4.5 4.5 7 2.5M19.5 4.5 17 2.5" />
        </>
      );
    case 'bell':
      return (
        <>
          <Path {...common} d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5" />
          <Path {...common} d="M13.7 20a2 2 0 0 1-3.4 0" />
        </>
      );
    case 'check-circle':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="9" />
          <Polyline {...common} points="8 12.2 11 15.2 16.2 9" />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="3" />
          <Path
            {...common}
            d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1"
          />
        </>
      );
    case 'plus':
      return (
        <>
          <Line {...common} x1="12" y1="5" x2="12" y2="19" />
          <Line {...common} x1="5" y1="12" x2="19" y2="12" />
        </>
      );
    case 'chevron-right':
      return <Polyline {...common} points="9 5 16 12 9 19" />;
    case 'chevron-left':
      return <Polyline {...common} points="15 5 8 12 15 19" />;
    case 'chevron-down':
      return <Polyline {...common} points="5 9 12 16 19 9" />;
    case 'close':
      return (
        <>
          <Line {...common} x1="6" y1="6" x2="18" y2="18" />
          <Line {...common} x1="18" y1="6" x2="6" y2="18" />
        </>
      );
    case 'trash':
      return (
        <>
          <Polyline {...common} points="4 6.5 20 6.5" />
          <Path {...common} d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
          <Path {...common} d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" />
        </>
      );
    case 'edit':
      return (
        <>
          <Path {...common} d="M16.5 3.9a2.1 2.1 0 0 1 3 3L8.2 18.2 4 20l1.8-4.2z" />
          <Line {...common} x1="14.5" y1="6" x2="18" y2="9.5" />
        </>
      );
    case 'play':
      return <Path {...common} fill={stroke} strokeWidth={1} d="M7.5 4.8v14.4l11.5-7.2z" />;
    case 'pause':
      return (
        <>
          <Rect {...common} x="7" y="5" width="3.6" height="14" rx="1.4" />
          <Rect {...common} x="13.4" y="5" width="3.6" height="14" rx="1.4" />
        </>
      );
    case 'volume':
      return (
        <>
          <Path {...common} d="M4 9.5h3L11.5 5v14L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1" />
          <Path {...common} d="M15.5 9.2a4 4 0 0 1 0 5.6" />
          <Path {...common} d="M18.2 6.5a8 8 0 0 1 0 11" />
        </>
      );
    case 'volume-off':
      return (
        <>
          <Path {...common} d="M4 9.5h3L11.5 5v14L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1" />
          <Line {...common} x1="16" y1="9.5" x2="21" y2="14.5" />
          <Line {...common} x1="21" y1="9.5" x2="16" y2="14.5" />
        </>
      );
    case 'shake':
      return (
        <>
          <Rect {...common} x="7" y="3" width="10" height="18" rx="2.5" />
          <Line {...common} x1="10.5" y1="17.5" x2="13.5" y2="17.5" />
          <Path {...common} d="M4 8.5 2.5 12 4 15.5M20 8.5 21.5 12 20 15.5" />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="4" />
          <Path {...common} d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      );
    case 'moon':
      return <Path {...common} d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5" />;
    case 'zap':
      return <Path {...common} d="M13.5 2.5 4 13.5h6.5l-.5 8 9.5-11H13z" />;
    case 'calendar':
      return (
        <>
          <Rect {...common} x="3.5" y="5" width="17" height="16" rx="3" />
          <Path {...common} d="M3.5 10h17M8 3v4M16 3v4" />
        </>
      );
    case 'check':
      return <Polyline {...common} points="5 12.5 9.5 17 19 7" />;
    case 'lock':
      return (
        <>
          <Rect {...common} x="4.5" y="10.5" width="15" height="10" rx="3" />
          <Path {...common} d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        </>
      );
    case 'crown':
      return (
        <>
          <Path {...common} d="M3.5 17.5h17l1.2-10.5-5.2 3.4L12 4l-4.5 6.4-5.2-3.4z" />
          <Line {...common} x1="4.8" y1="20" x2="19.2" y2="20" />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path {...common} d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
          <Polyline {...common} points="18.5 2.5 18.5 6.5 14.5 6.5" />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.5" />
          <Polyline {...common} points="12 7 12 12 15.5 14" />
        </>
      );
    case 'info':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="9" />
          <Line {...common} x1="12" y1="11" x2="12" y2="16.5" />
          <Circle cx="12" cy="7.8" r="1.1" fill={stroke} stroke="none" />
        </>
      );
    case 'skip':
      return (
        <>
          <Path {...common} fill={stroke} strokeWidth={1} d="M6 5.5v13l9-6.5z" />
          <Rect {...common} x="16.5" y="5" width="2.6" height="14" rx="1.3" />
        </>
      );
    case 'activity':
      return <Polyline {...common} points="2.5 12.5 7.5 12.5 10 5 14 19 16.5 12.5 21.5 12.5" />;
    case 'shield':
      return (
        <>
          <Path {...common} d="M12 2.5 4.5 5.8v5.4c0 4.6 3.1 8.8 7.5 10.3 4.4-1.5 7.5-5.7 7.5-10.3V5.8z" />
          <Polyline {...common} points="8.8 12 11.2 14.4 15.4 9.6" />
        </>
      );
    case 'sparkles':
      return (
        <>
          <Path {...common} d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9z" />
          <Path {...common} d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
        </>
      );
    case 'star':
      return (
        <Path
          {...common}
          d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1.03 6L12 17.06 6.62 19.85l1.03-6L3.3 9.6l6-.9z"
        />
      );
    case 'menu':
      return (
        <>
          <Line {...common} x1="4" y1="7" x2="20" y2="7" />
          <Line {...common} x1="4" y1="12" x2="20" y2="12" />
          <Line {...common} x1="4" y1="17" x2="20" y2="17" />
        </>
      );
    case 'power':
      return (
        <>
          <Path {...common} d="M12 3.5v8" />
          <Path {...common} d="M17.7 6.6a8 8 0 1 1-11.4 0" />
        </>
      );
    case 'arrow-up-right':
      return (
        <>
          <Polyline {...common} points="7 17 17 7" />
          <Polyline {...common} points="8.5 7 17 7 17 15.5" />
        </>
      );
    case 'repeat':
      return (
        <>
          <Polyline {...common} points="17 2.5 20.5 6 17 9.5" />
          <Path {...common} d="M3.5 12.5v-2a4.5 4.5 0 0 1 4.5-4.5h12.5" />
          <Polyline {...common} points="7 21.5 3.5 18 7 14.5" />
          <Path {...common} d="M20.5 11.5v2a4.5 4.5 0 0 1-4.5 4.5H3.5" />
        </>
      );
    case 'flag':
      return (
        <>
          <Path {...common} d="M5 21.5V3.5" />
          <Path {...common} d="M5 4.5h11.5l-2 3.6 2 3.6H5z" />
        </>
      );
    case 'gauge':
      return (
        <>
          <Path {...common} d="M3.6 17a9.5 9.5 0 1 1 16.8 0" />
          <Line {...common} x1="12" y1="16" x2="16" y2="10.5" />
          <Circle {...common} cx="12" cy="17" r="1.6" />
        </>
      );
    default:
      return null;
  }
}
