// Global type declarations

declare global {
  interface Window {
    globalErrorHandlerActive?: boolean;
    __NEXT_DATA__?: {
      err?: Error;
    };
    __NEXT_AUTH?: {
      errorHandler?: (error: any) => void;
    };
    next?: {
      router?: {
        events?: {
          on: (event: string, handler: (err: Error, url: string) => void) => void;
        };
      };
    };
  }
}

export {};
