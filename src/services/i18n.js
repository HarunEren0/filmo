import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import tr from '../locales/tr.json';
import en from '../locales/en.json';

const i18n = new I18n({
  'tr-TR': tr,
  'tr': tr,
  'en-US': en,
  'en': en
});

i18n.enableFallback = true;
// Default to Turkish if local is not available
i18n.defaultLocale = 'tr-TR';

export default i18n;
