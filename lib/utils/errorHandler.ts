/**
 * Extracts error message from various error formats
 * Handles Error objects, axios errors, and generic objects
 */
export const extractErrorMessage = (err: unknown): string => {
  const defaultErrorMessage = 'Failed to perform action';

  if (err instanceof Error) {
    // Check if error has data property (from axios error)
    if ('data' in err && typeof err.data === 'object' && err.data !== null) {
      const errorData = err.data as Record<string, unknown>;
      if (typeof errorData.message === 'string') {
        return errorData.message;
      }
    }

    // Check for message property
    if (err.message) {
      return err.message;
    }
  }

  // Fallback for unknown error types
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>;
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }

  return defaultErrorMessage;
};
