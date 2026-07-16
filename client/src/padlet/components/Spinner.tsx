export default function Spinner({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className={`${className} border-4 border-orange-500 border-t-transparent rounded-full animate-spin`} />
  );
}
