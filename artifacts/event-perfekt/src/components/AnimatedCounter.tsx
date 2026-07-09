import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  targetValue: string;
  duration?: number;
  label: string;
  delay?: number;
}

export function AnimatedCounter({ targetValue, duration = 1500, label, delay = 0 }: AnimatedCounterProps) {
  const [currentValue, setCurrentValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  // Extract numeric value and suffix from target
  const getNumericValue = (value: string) => {
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const getSuffix = (value: string) => {
    return value.replace(/\d+/, '');
  };

  const numericTarget = getNumericValue(targetValue);
  const suffix = getSuffix(targetValue);

  useEffect(() => {
    // Start animation immediately when component mounts
    if (!hasAnimated) {
      setHasAnimated(true);
      setIsAnimating(true);
      // Add a small delay for staggered effect
      // Use the passed delay prop
      setTimeout(() => {
        animateValue();
      }, delay);
    }
  }, [hasAnimated, duration]);

  const animateValue = () => {
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use linear progress for more visible counting
      const current = Math.floor(startValue + (numericTarget - startValue) * progress);

      setCurrentValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(numericTarget);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div ref={counterRef} className="text-center transform transition-all duration-300 hover:scale-105">
      <div className={`text-6xl font-bold mb-2 tabular-nums transition-all duration-500 ${
        isAnimating ? 'text-yellow-300 scale-125 drop-shadow-lg' : 'text-white scale-100'
      }`} style={{
        textShadow: isAnimating ? '0 0 20px rgba(255, 255, 0, 0.8)' : 'none'
      }}>
        {currentValue}{suffix}
      </div>
      <div className="text-white text-lg" style={{color: 'white !important'}}>{label}</div>
    </div>
  );
}