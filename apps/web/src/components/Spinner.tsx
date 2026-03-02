import { Loader2 } from 'lucide-react';
import { cn } from '../utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export default function Spinner({ size = 24, className, ...props }: SpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center animate-spin text-primary", className)} {...props}>
      <Loader2 size={size} />
    </div>
  );
}
