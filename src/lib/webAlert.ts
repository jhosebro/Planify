import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * react-native-web implementa Alert.alert como no-op: en web los formularios
 * validaban y no mostraban ningún mensaje. Lo traducimos a los diálogos del navegador.
 * shortcut: con 2+ botones no-cancel se ejecuta solo el último (window.confirm tiene 2 opciones); si hace falta un menú real, usar un modal propio.
 */
export function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  const text = [title, message].filter(Boolean).join('\n\n');
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const actions = buttons?.filter((b) => b !== cancel) ?? [];

  if (!cancel && actions.length <= 1) {
    window.alert(text);
    actions[0]?.onPress?.();
    return;
  }
  if (window.confirm(text)) actions[actions.length - 1]?.onPress?.();
  else cancel?.onPress?.();
}

export function installWebAlert(): void {
  if (Platform.OS === 'web') Alert.alert = webAlert;
}
