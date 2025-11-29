import React, { useEffect, useRef } from 'react';

type ParticleType = 'confetti' | 'suit' | 'card';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  type: ParticleType;
  symbol?: string;
  oscillationSpeed: number;
  oscillationOffset: number;
}

export const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    const particles: Particle[] = [];
    const colors = ['#009c3b', '#ffdf00', '#002776', '#ffffff']; // Brazil colors
    const suits = ['♦', '♥', '♠', '♣'];

    const createParticle = (yOverride?: number): Particle => {
      const typeRoll = Math.random();
      let type: ParticleType = 'confetti';
      if (typeRoll > 0.7) type = 'suit';
      else if (typeRoll > 0.9) type = 'card';

      let symbol = '';
      let color = colors[Math.floor(Math.random() * colors.length)];

      if (type === 'suit') {
        symbol = suits[Math.floor(Math.random() * suits.length)];
        if (symbol === '♦' || symbol === '♥') color = '#ef4444'; // Red
        if (symbol === '♦') color = '#eab308'; // Gold for Ouros focus
        else if (symbol === '♠' || symbol === '♣') color = '#1f2937'; // Dark
      } else if (type === 'card') {
        color = '#ffffff';
      }

      const sizeBase = type === 'confetti' ? 8 : 20;

      return {
        x: Math.random() * canvas.width,
        y: yOverride ?? Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 3 + 2, // Falling speed
        size: Math.random() * 10 + sizeBase,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
        color: color,
        type: type,
        symbol: symbol,
        oscillationSpeed: Math.random() * 0.05 + 0.02,
        oscillationOffset: Math.random() * Math.PI * 2,
      };
    };

    // Initialize particles
    for (let i = 0; i < 150; i++) {
      particles.push(createParticle());
    }

    let animationId: number;

    const render = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        // Physics
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.oscillationOffset += p.oscillationSpeed;
        
        // Sway movement
        p.x += Math.sin(p.oscillationOffset) * 1.5;

        // Respawn logic
        if (p.y > canvas.height + 50) {
          const newP = createParticle(-50);
          Object.assign(p, newP);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.type === 'confetti') {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } 
        else if (p.type === 'suit') {
          ctx.font = `${p.size}px serif`;
          ctx.fillStyle = p.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.symbol!, 0, 0);
        } 
        else if (p.type === 'card') {
          // Draw mini card
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 4;
          ctx.fillRect(-p.size / 2, -p.size * 0.7, p.size, p.size * 1.4);
          ctx.shadowBlur = 0;
          
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          ctx.strokeRect(-p.size / 2, -p.size * 0.7, p.size, p.size * 1.4);
          
          // Tiny suit inside
          ctx.font = `${p.size / 2}px serif`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('♣', 0, 0);
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => setSize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none" />;
};