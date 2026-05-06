import { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, View, Dimensions } from 'react-native';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA', '#F0B67F', '#FE4A49', '#A239CA', '#7BC67E', '#FFB347'];

type Props = {
  active: boolean;
  onComplete?: () => void;
};

export function Confetti({ active, onComplete }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get('window');

  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        x: (Math.random() - 0.5) * 2,
        y: -(Math.random() * 0.7 + 0.3),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        dir: Math.random() > 0.5 ? 1 : -1,
      })),
    [],
  );

  useEffect(() => {
    if (!active) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start(() => onComplete?.());
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: width / 2 - p.size / 2,
            top: height * 0.35,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 2,
            opacity: progress.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [1, 0.8, 0],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.x * width * 0.5],
                }),
              },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0, p.y * 200, p.y * 200 + 500],
                }),
              },
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${720 * p.dir}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
