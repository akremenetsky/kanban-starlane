
/* Finnish locals for flatpickr */
import { CustomLocale } from '../types/locale';


export const Finnish: CustomLocale = {
  firstDayOfWeek: 1,

  weekdays: {
    shorthand: ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'],
    longhand: [
      'sunnuntai',
      'maanantai',
      'tiistai',
      'keskiviikko',
      'torstai',
      'perjantai',
      'lauantai',
    ],
  },

  months: {
    shorthand: [
      'tammi',
      'helmi',
      'maalis',
      'huhti',
      'touko',
      'kesä',
      'heinä',
      'elo',
      'syys',
      'loka',
      'marras',
      'joulu',
    ],
    longhand: [
      'tammikuu',
      'helmikuu',
      'maaliskuu',
      'huhtikuu',
      'toukokuu',
      'kesäkuu',
      'heinäkuu',
      'elokuu',
      'syyskuu',
      'lokakuu',
      'marraskuu',
      'joulukuu',
    ],
  },

  ordinal: () => {
    return '.';
  },
  time_24hr: true,
};


