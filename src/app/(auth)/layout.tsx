import ParticlesCanvas from '@/components/ui/ParticlesCanvas';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#F7F5F0] p-4 font-sans text-[#1E1E1E] overflow-hidden">
      {/* HTML5 Canvas Animated Star Particles */}
      <ParticlesCanvas />

      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}





