import { useState, useCallback, useRef, useEffect, Dispatch, SetStateAction } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  parser?: (val: string) => T,
  stringifier?: (val: T) => string,
  isEnabled: boolean = true
): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isEnabled) return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return parser ? parser(item) : JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const enabledRef = useRef(isEnabled);
  useEffect(() => {
    enabledRef.current = isEnabled;
    // If setting is turned on, save current state right away
    if (isEnabled && typeof window !== 'undefined') {
      window.localStorage.setItem(key, stringifier ? stringifier(storedValue) : JSON.stringify(storedValue));
    }
    // Optional: if turned off, we could remove it from localStorage, but leaving it is fine as it won't be read.
    if (!isEnabled && typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  }, [isEnabled, key, storedValue, stringifier]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        if (enabledRef.current && typeof window !== 'undefined') {
          window.localStorage.setItem(key, stringifier ? stringifier(valueToStore) : JSON.stringify(valueToStore));
        }
        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, stringifier]);

  return [storedValue, setValue];
}
