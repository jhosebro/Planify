import { Platform } from 'react-native';

export const FONT_FAMILY: string =
  Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  }) ?? 'sans-serif';