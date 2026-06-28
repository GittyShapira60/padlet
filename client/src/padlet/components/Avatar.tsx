const SIZE = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm' } as const;

interface Props {
  username: string;
  size?: keyof typeof SIZE;
  className?: string;
}

export default function Avatar({ username, size = 'sm', className = '' }: Props) {
  return (
    <div className={`${SIZE[size]} rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
