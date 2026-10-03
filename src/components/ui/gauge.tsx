import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/tokens';

type GaugeProps = {
  /** 0-100. */
  value: number;
  label?: string;
  caption?: string;
  size?: number;
  thickness?: number;
  /** Maps the score to a colour; defaults to a mint→violet blend. */
  colorForValue?: (value: number) => string;
};

/**
 * Semicircular gauge, as used by the stats screen. The arc spans 180° and the
 * needle is rotated with a plain SVG group transform.
 */
export function Gauge({ value, label, caption, size = 190, thickness = 18, colorForValue }: GaugeProps) {
  const { colors } = useTheme();
  const clamped = Math.min(100, Math.max(0, value));

  const center = size / 2;
  const radius = center - thickness / 2 - 4;
  const arcPath = describeArc(center, center, radius, 180, 0);
  const progressPath = describeArc(center, center, radius, 180, 180 * (clamped / 100));

  const angle = 180 * (clamped / 100);
  const needleLength = radius - thickness / 2 - 6;
  const radians = ((angle - 180) * Math.PI) / 180;
  const needleX = center + needleLength * Math.cos(radians);
  const needleY = center + needleLength * Math.sin(radians);

  const valueColor = colorForValue ? colorForValue(clamped) : colors.accent;

  return (
    <View style={{ width: size, height: size * 0.62, alignItems: 'center' }}>
      <Svg width={size} height={size * 0.62}>
        <Path d={arcPath} stroke={colors.surfaceSunken} strokeWidth={thickness} fill="none" strokeLinecap="round" />
        {clamped > 0 ? (
          <Path d={progressPath} stroke={valueColor} strokeWidth={thickness} fill="none" strokeLinecap="round" />
        ) : null}
        <G>
          <Circle cx={center} cy={center} r={thickness / 2 + 4} fill={colors.surface} />
          <Path
            d={`M ${center} ${center} L ${needleX} ${needleY}`}
            stroke={valueColor}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <Circle cx={center} cy={center} r={6} fill={valueColor} />
        </G>
      </Svg>

      <View style={styles.overlay}>
        {label ? (
          <Text style={[typography.display, { color: colors.text, fontSize: size * 0.17 }]}>{label}</Text>
        ) : null}
        {caption ? <Text style={[typography.micro, { color: colors.textMuted }]}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}
