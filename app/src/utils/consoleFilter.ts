export const initConsoleFilter = (): void => {
  if (process.env.NODE_ENV === 'development') {
    const originalError = console.error;
    const originalWarn = console.warn;

    const IGNORED_ERRORS: string[] = [
      'TronLink',
      'ethereum',
      'solana',
      'tabReply',
      'Extension',
      'content.js',
      'injected.js',
      'Cross-Origin-Opener-Policy',
      'BloomFilter'
    ];

    console.error = (...args: unknown[]): void => {
      const errorString = args.map(arg => String(arg)).join(' ');
      if (IGNORED_ERRORS.some(ignored => errorString.includes(ignored))) {
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args: unknown[]): void => {
      const warnString = args.map(arg => String(arg)).join(' ');
      if (IGNORED_ERRORS.some(ignored => warnString.includes(ignored))) {
        return;
      }
      originalWarn.apply(console, args);
    };
  }
};
