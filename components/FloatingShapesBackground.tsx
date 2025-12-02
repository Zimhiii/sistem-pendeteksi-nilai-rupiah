import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, View } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface FloatingCircle {
  id: number;
  size: number;
  x: number;
  animatedY: Animated.Value;
  opacity: Animated.Value;
  duration: number;
}

const FloatingShapesBackground: React.FC = () => {
  const circles = useRef<FloatingCircle[]>([]);

  useEffect(() => {
    // Create floating circles
    const circleCount = 8;
    circles.current = Array.from({ length: circleCount }, (_, index) => ({
      id: index,
      size: Math.random() * 40 + 20, // 20-60px
      x: Math.random() * screenWidth,
      animatedY: new Animated.Value(screenHeight + 100),
      opacity: new Animated.Value(0),
      duration: Math.random() * 3000 + 4000, // 4-7 seconds
    }));

    // Start animations
    circles.current.forEach((circle, index) => {
      const startDelay = index * 800; // Stagger the start times

      const animateCircle = () => {
        // Reset position
        circle.animatedY.setValue(screenHeight + 100);
        circle.opacity.setValue(0);

        // Animate upward movement with opacity changes
        Animated.parallel([
          Animated.sequence([
            Animated.timing(circle.opacity, {
              toValue: 0.1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(circle.opacity, {
              toValue: 0.05,
              duration: circle.duration - 1000,
              useNativeDriver: true,
            }),
            Animated.timing(circle.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(circle.animatedY, {
            toValue: -100,
            duration: circle.duration,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Restart animation
          setTimeout(animateCircle, Math.random() * 2000);
        });
      };

      setTimeout(animateCircle, startDelay);
    });
  }, []);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
      }}
      pointerEvents="none"
    >
      {/* Gradient Background */}
      <View
        style={{
          flex: 1,
          backgroundColor: "linear-gradient(180deg, #000033 0%, #000066 100%)",
          // backgroundColor: 'linear-gradient(180deg, #000033 0%, #000066 100%)',
        }}
      />

      {/* Floating Circles */}
      {circles.current.map((circle) => (
        <Animated.View
          key={circle.id}
          style={{
            position: "absolute",
            left: circle.x,
            width: circle.size,
            height: circle.size,
            borderRadius: circle.size / 2,
            backgroundColor: "#3B82F6",
            transform: [{ translateY: circle.animatedY }],
            opacity: circle.opacity,
          }}
        />
      ))}
    </View>
  );
};

export default FloatingShapesBackground;
