interface TeamLogoProps {
  src: string;
  name: string;
  className?: string;
}

export function TeamLogo({ src, name, className = 'w-8 h-8' }: TeamLogoProps) {
  if (src.startsWith('http')) {
    return <img src={src} alt={name} className={`${className} object-contain`} />;
  }
  return <span className="text-2xl leading-none">{src}</span>;
}
