export default function Footer() {
  return (
    <footer className="border-t border-[var(--valo-gray-light)] bg-[var(--valo-darker)] px-6 py-4 mt-auto">
      <div className="flex items-center justify-between text-xs text-[var(--valo-text-dim)]">
        <div>
          <span className="text-[var(--valo-text)]">AutoApplier</span> © {new Date().getFullYear()} • 
          <span className="ml-1">Tactical Job Hunt System</span>
        </div>
        
        <div className="text-right max-w-xl">
          <p>
            AutoApplier is a fan-created project inspired by tactical gaming aesthetics. 
            This project is not affiliated with, endorsed, or sponsored by any game publisher.
            All original game assets and trademarks belong to their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
