import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

const frameCount = 660;

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const navigate = useNavigate();

  // Load images
  useEffect(() => {
    const loadImages = async () => {
      const loadedImages: HTMLImageElement[] = new Array(frameCount);
      let loadedCount = 0;

      const promises = [];
      for (let i = 1; i <= frameCount; i++) {
        const promise = new Promise<void>((resolve) => {
            const img = new Image();
            const src = `/frames/frame_${i.toString().padStart(4, '0')}.png`;
            img.src = src;
            img.onload = () => {
                loadedImages[i-1] = img;
                loadedCount++;
                setLoadingProgress(Math.round((loadedCount / frameCount) * 100));
                resolve();
            };
            img.onerror = () => {
                console.error(`Failed to load frame ${i}`);
                resolve(); // Resolve anyway to continue
            };
        });
        promises.push(promise);
      }

      await Promise.all(promises);
      setImages(loadedImages);
      setIsLoaded(true);
    };
    loadImages();
  }, []);

  // Animation
  useEffect(() => {
    if (!isLoaded || !canvasRef.current || images.length === 0) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Initial size with High DPI support
    const updateSize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        context.scale(dpr, dpr);
    };
    updateSize();

    // Start from index 1 (frame_0002.png) as requested
    const frame = { index: 1 };

    const render = () => {
      const img = images[Math.floor(frame.index)];
      if (img) {
        // Scale to fit width (fill screen width)
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        const ratio = canvasWidth / img.width;

        const centerShift_x = (canvasWidth - img.width * ratio) / 2;
        const centerShift_y = (canvasHeight - img.height * ratio) / 2;

        // Clear with black background
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        context.drawImage(
            img,
            0, 0, img.width, img.height,
            centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
        );
      }
    };

    // GSAP ScrollTrigger
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".landing-container",
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
            pin: true,
        }
    });

    tl.to(frame, {
        index: frameCount - 1,
        ease: "none",
        onUpdate: render,
    });

    render(); // Initial render

    // Resize handler
    const handleResize = () => {
        updateSize();
        render();
    };
    window.addEventListener('resize', handleResize);

    return () => {
        ScrollTrigger.getAll().forEach(t => t.kill());
        window.removeEventListener('resize', handleResize);
    };
  }, [isLoaded, images]);

  if (!isLoaded) {
      return (
          <div className="flex items-center justify-center h-screen bg-black text-white">
              <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">Loading Experience...</h2>
                  <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${loadingProgress}%` }}
                      />
                  </div>
                  <p className="mt-2 text-gray-400">{loadingProgress}%</p>
              </div>
          </div>
      );
  }

  return (
    <div className="landing-container relative h-[1000vh] bg-black">
      <div className="fixed top-0 left-0 w-full h-full z-0">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
      </div>

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none mix-blend-difference">
         <h1 className="text-7xl font-bold text-white mb-6 tracking-tight">CogniSafe</h1>
         <p className="text-2xl text-gray-300 font-light tracking-wide">Next-Gen Cognitive Health Assessment</p>
      </div>

      <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-20">
         <button
            onClick={() => navigate('/dashboard')}
            className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/30 font-semibold py-4 px-10 rounded-full shadow-2xl transition-all transform hover:scale-105 hover:shadow-blue-500/20"
         >
            Launch Dashboard
         </button>
      </div>

      <div className="fixed bottom-4 right-4 text-white/30 text-xs z-10">
        Scroll to explore
      </div>
    </div>
  );
}
