/** Fake of obsidian-daily-notes-interface (its CJS build `require`s the real obsidian module). */
export const getDailyNoteSettings = () => ({ format: 'YYYY-MM-DD', folder: '', template: '' });
export const getDateFromFile = (): null => null;
export const getAllDailyNotes = () => ({});
export const getDailyNote = (): null => null;
export const createDailyNote = async (): Promise<null> => null;
export const appHasDailyNotesPluginLoaded = () => false;
