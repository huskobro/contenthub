import { createContext, useContext } from "react";
import { useVisibility } from "../../hooks/useVisibility";

interface ReadOnlyContextValue {
  readOnly: boolean;
}

const ReadOnlyContext = createContext<ReadOnlyContextValue>({ readOnly: false });

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext).readOnly;
}

interface ReadOnlyGuardProps {
  targetKey: string;
  children: React.ReactNode;
}

/**
 * Wraps a section with read_only awareness.
 * Children can call useReadOnly() to check if they should disable inputs.
 */
export function ReadOnlyGuard({ targetKey, children }: ReadOnlyGuardProps) {
  const { readOnly } = useVisibility(targetKey);
  return (
    <ReadOnlyContext.Provider value={{ readOnly }}>
      {children}
    </ReadOnlyContext.Provider>
  );
}
