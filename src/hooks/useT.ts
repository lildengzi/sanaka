import { getMessage } from '../lib/i18n';
import { useAppStore } from '../store/AppStore';

export function useT() {
  const { messages } = useAppStore();
  return (key: string) => getMessage(messages, key);
}
