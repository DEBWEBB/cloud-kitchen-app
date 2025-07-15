import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

const SparkleParticles = () => {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: false },
        background: { color: "transparent" },
        fpsLimit: 60,
        particles: {
          number: { value: 10 },
          size: { value: 2 },
          color: { value: "#fff" },
          move: {
            enable: true,
            speed: 0.6,
            direction: "none",
            outModes: "bounce",
          },
          links: {
            enable: false,
          },
          opacity: {
            value: 0.7,
          },
        },
        detectRetina: true,
      }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "60px",
        height: "60px",
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
};

export default SparkleParticles;
